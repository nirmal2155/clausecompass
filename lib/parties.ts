import { Clause } from "@/lib/schema";

export interface ContractParty {
  name: string;
  shortName: string;
  role: string;
  address: string;
  isCompany: boolean;
}

export interface ContractSignatory {
  name: string;
  role: string;
  title: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface ContractPartiesResult {
  counterparty: ContractParty;
  signatory: ContractSignatory;
}

/**
 * Intelligent Contract Party Extractor
 * Extracts counterparty and user/signatory names, designations, and addresses
 * from the contract preamble and initial clauses.
 */
export function extractContractParties(
  text: string = "",
  clauses: Clause[] = [],
  userRole: string = "Signatory"
): ContractPartiesResult {
  const roleLower = (userRole || "").toLowerCase();

  // 1. Isolate contract preamble (prior to clause 1 / operative terms)
  const preambleStopRegex = /(?:NOW THIS AGREEMENT WITNESSETH|NOW THEREFORE|NOW IT IS HEREBY MUTUALLY AGREED|\n\s*(?:CLAUSE\s*|ARTICLE\s*|SECTION\s*)?1\.\s+)/i;
  const stopIndex = text.search(preambleStopRegex);
  let preamble = stopIndex !== -1 ? text.slice(0, stopIndex) : text.slice(0, 3500);

  if (!preamble.trim() && Array.isArray(clauses) && clauses.length > 0) {
    preamble = clauses.slice(0, 5).map(c => `${c.heading || ""}\n${c.text || ""}`).join("\n\n");
  }

  const lines = preamble.split("\n").map(l => l.trim()).filter(Boolean);

  const counterparty: ContractParty = {
    name: "",
    shortName: "",
    role: "",
    address: "",
    isCompany: false,
  };

  const signatory: ContractSignatory = {
    name: "",
    role: userRole || "Signatory",
    title: "",
    address: "",
  };

  const cleanName = (str: string): string => {
    let name = str.split(/,|(?:having (?:its|registered|workshop)?\s*office at)|(?:having office at)|(?:residing at)|(?:PAN:)|(?:Aadhaar:)|(?:an early-stage)/i)[0].trim();
    name = name.replace(/^(?:AND\s+)?(?:CLIENT|CONTRACTOR|COMPANY|EMPLOYEE|EMPLOYER|LESSOR|LESSEE|LANDLORD|TENANT|INSTITUTE|ACADEMY|STUDENT|PARENT|SELLER|BUYER|LENDER|BORROWER|DISCLOSING PARTY|RECEIVING PARTY|FIRST PARTY|SECOND PARTY|LICENSOR|LICENSEE|PROMOTER|ALLOTTEE|FRANCHISOR|FRANCHISEE|PRINCIPAL|AGENT|CONSIGNOR|CONSIGNEE)(?:\s*\([^)]*\))?\s*[:\-]?\s*/i, "");
    return name.replace(/["']/g, "").trim();
  };

  const extractAddress = (str: string): string => {
    const match = str.match(/(?:residing at|having (?:its|registered|workshop)?\s*office at|having office at|workshop at|based in)\s+([^(".\n]+(?:(?:Bengaluru|Bangalore|Delhi|Mumbai|Pune|Jaipur|Gurugram|Noida|Hyderabad|Kota|Ahmedabad|Telangana|Karnataka|Maharashtra|Haryana|Rajasthan|Uttar Pradesh|Madhya Pradesh|Bhopal|Green Park|Connaught Place|Indiranagar|Koramangala|BKC|Bandra Kurla Complex|Mansarovar|Jubilee Hills|Cyber City)[^("\n]*))/i);
    if (match) {
      return match[1].replace(/,\s*(?:hereinafter|which expression).*$/i, "").trim().replace(/["\.,]+$/, "");
    }
    const locMatch = str.match(/(?:residing at|having (?:its|registered)?\s*office at|having office at|workshop at|based in)\s+([^(".\n]+)/i);
    if (locMatch) {
      return locMatch[1].replace(/,\s*(?:hereinafter|which expression).*$/i, "").trim().replace(/["\.,]+$/, "");
    }
    return "";
  };

  const isEmployeeUser = roleLower.includes("employee");
  const isContractorUser = roleLower.includes("contractor") || roleLower.includes("freelance") || roleLower.includes("consultant");
  const isClientUser = roleLower.includes("client");
  const isTenantUser = roleLower.includes("tenant") || roleLower.includes("lessee");
  const isLandlordUser = roleLower.includes("landlord") || roleLower.includes("lessor");
  const isParentStudentUser = roleLower.includes("student") || roleLower.includes("parent") || roleLower.includes("consumer");
  const isBuyerUser = roleLower.includes("buyer") || roleLower.includes("purchaser");
  const isSellerUser = roleLower.includes("seller");
  const isInvestorUser = roleLower.includes("investor") || roleLower.includes("receiving");
  const isBorrowerUser = roleLower.includes("borrower");
  const isLicenseeUser = roleLower.includes('licensee');
  const isAllotteeUser = roleLower.includes('allottee') || roleLower.includes('buyer');
  const isFranchiseeUser = roleLower.includes('franchisee');
  const isAgentUser = roleLower.includes('agent');
  const isConsigneeUser = roleLower.includes('consignee');
  const isFirstPartyUser = roleLower.includes('first party');

  const getTargetText = (line: string, nextLine: string): string => {
    const stripped = line.replace(/^(?:AND\s+)?(?:CLIENT|CONTRACTOR|COMPANY|EMPLOYEE|EMPLOYER|LESSOR|LESSEE|LANDLORD|TENANT|INSTITUTE|ACADEMY|STUDENT\s*&\s*PARENT(?:\s*\/\s*GUARDIAN)?|STUDENT|PARENT|SELLER|BUYER|LENDER|BORROWER|DISCLOSING PARTY\s*\/?\s*STARTUP|RECEIVING PARTY\s*\/?\s*INVESTOR|DISCLOSING PARTY|RECEIVING PARTY|FIRST PARTY|SECOND PARTY|LICENSOR|LICENSEE|PROMOTER|ALLOTTEE|FRANCHISOR|FRANCHISEE|PRINCIPAL|AGENT|CONSIGNOR|CONSIGNEE)(?:\s*\([^)]*\))?\s*[:\-]?\s*/i, "").trim();
    if (stripped.length > 3) {
      return stripped;
    }
    return nextLine || line;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";
    const rawCombined = line + " " + nextLine;

    // 1. CLIENT
    if (/^(?:AND\s+)?CLIENT(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Client",
      };
      if (isContractorUser) {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Client";
        }
      } else {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.role = "Client";
        }
      }
    }

    // 2. CONTRACTOR
    if (/^(?:AND\s+)?CONTRACTOR(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Contractor",
      };
      const titleMatch = target.match(/(?:Ms\.|Mr\.|Dr\.)\s+[A-Za-z\s]+,\s*([^,]+),/i);
      const title = titleMatch ? titleMatch[1].trim() : "Independent Contractor";

      if (isContractorUser) {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.title = title;
          signatory.role = "Contractor";
        }
      } else {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Contractor";
        }
      }
    }

    // 3. COMPANY / EMPLOYER
    if (/^(?:AND\s+)?(?:COMPANY|EMPLOYER)(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line) || /^[A-Z0-9\s]+(?:PRIVATE LIMITED|LTD|LLP|INC).*\(["']Company["']\)/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Employer",
      };
      if (isEmployeeUser) {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Employer";
        }
      } else {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.role = "Employer";
        }
      }
    }

    // 4. EMPLOYEE
    if (/^(?:AND\s+)?EMPLOYEE(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line) || /(?:Mr\.|Ms\.|Dr\.)\s+[A-Za-z\s]+.*\(["']Employee["']\)/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Employee",
      };
      if (isEmployeeUser) {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.role = "Employee";
        }
      } else {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Employee";
        }
      }
    }

    // 5. LESSOR / LANDLORD
    if (/^(?:AND\s+)?(?:LESSOR|LANDLORD)(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Landlord",
      };
      if (isTenantUser) {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Landlord";
        }
      } else {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.role = "Landlord";
        }
      }
    }

    // 6. LESSEE / TENANT
    if (/^(?:AND\s+)?(?:LESSEE|TENANT)(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Tenant",
      };
      if (isTenantUser) {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.role = "Tenant";
        }
      } else {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Tenant";
        }
      }
    }

    // 7. INSTITUTE / ACADEMY
    if (/^(?:AND\s+)?(?:INSTITUTE|ACADEMY)(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Institute",
      };
      if (isParentStudentUser) {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Institute";
        }
      } else {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.role = "Institute";
        }
      }
    }

    // 8. STUDENT & PARENT
    if (/^(?:AND\s+)?(?:STUDENT|PARENT)(?:\s*&.*)?\s*[:\-]?/i.test(line)) {
      const target = getTargetText(line, nextLine);
      let pName = "";
      const parentMatch = target.match(/Parent:\s*([^,]+)/i);
      const studentMatch = target.match(/Student Name:\s*([^|,\n]+)/i);
      if (parentMatch && studentMatch) {
        pName = `${parentMatch[1].trim()} (Parent of ${studentMatch[1].trim()})`;
      } else if (parentMatch) {
        pName = parentMatch[1].trim();
      } else if (studentMatch) {
        pName = studentMatch[1].trim();
      } else {
        pName = cleanName(target);
      }
      const addrMatch = target.match(/(?:,\s*)([A-Za-z\s]+(?:Madhya Pradesh|Delhi|Rajasthan|Mumbai|Pune|Bengaluru)[^(\n]*)/i);
      const addr = addrMatch ? addrMatch[1].replace(/["()]/g, "").trim() : "";

      if (isParentStudentUser) {
        if (!signatory.name) {
          signatory.name = pName;
          signatory.address = addr;
          signatory.role = "Parent / Student";
        }
      } else {
        if (!counterparty.name) {
          counterparty.name = pName;
          counterparty.address = addr;
          counterparty.role = "Parent / Student";
        }
      }
    }

    // 9. SELLER
    if (/^(?:AND\s+)?SELLER(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Seller",
      };
      if (isBuyerUser) {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Seller";
        }
      } else {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.role = "Seller";
        }
      }
    }

    // 10. BUYER
    if (/^(?:AND\s+)?BUYER(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Buyer",
      };
      if (isBuyerUser) {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.role = "Buyer";
        }
      } else {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Buyer";
        }
      }
    }

    // 11. STARTUP / INVESTOR (NDA)
    if (/DISCLOSING PARTY|STARTUP/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Startup",
      };
      if (isInvestorUser) {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Startup";
        }
      } else {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.role = "Startup";
        }
      }
    }

    if (/RECEIVING PARTY|INVESTOR/i.test(line)) {
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: "Investor",
      };
      if (isInvestorUser) {
        if (!signatory.name) {
          signatory.name = parsed.name;
          signatory.address = parsed.address;
          signatory.role = "Investor";
        }
      } else {
        if (!counterparty.name) {
          counterparty.name = parsed.name;
          counterparty.address = parsed.address;
          counterparty.role = "Investor";
        }
      }
    }

    // 12. SaaS / Consumer platform (operated by X)
    if (/operated by\s+([^(".\n]+)/i.test(line)) {
      const saasMatch = line.match(/operated by\s+([^(".\n]+)/i);
      if (saasMatch && !counterparty.name) {
        counterparty.name = saasMatch[1].trim();
        counterparty.role = "Service Provider";
      }
    }

    // 13. Lender / Borrower (Loan agreements)
    if (/between\s+([^(".\n]+(?:NBFC|Bank|Finance|Capital))\s*\([^)]*Lender[^)]*\)\s*and\s+([^(".\n]+)\s*\([^)]*Borrower[^)]*\)/i.test(line)) {
      const match = line.match(/between\s+([^(".\n]+(?:NBFC|Bank|Finance|Capital))\s*\([^)]*Lender[^)]*\)\s*and\s+([^(".\n]+)\s*\([^)]*Borrower[^)]*\)/i);
      if (match) {
        if (isBorrowerUser) {
          counterparty.name = match[1].trim();
          counterparty.role = "Lender";
          signatory.name = match[2].trim();
          signatory.role = "Borrower";
        } else {
          signatory.name = match[1].trim();
          counterparty.name = match[2].trim();
        }
      }
    }

    // 14. FIRST PARTY / SECOND PARTY
    if (/^(?:AND\s+)?(?:FIRST PARTY|SECOND PARTY)(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const isFirst = /FIRST PARTY/i.test(line);
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: isFirst ? "First Party" : "Second Party",
      };
      if (isFirstPartyUser) {
        if (isFirst) {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "First Party";
          }
        } else {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Second Party";
          }
        }
      } else {
        if (isFirst) {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "First Party";
          }
        } else {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Second Party";
          }
        }
      }
    }

    // 15. LICENSOR / LICENSEE
    if (/^(?:AND\s+)?(?:LICENSOR|LICENSEE)(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const isLicensor = /LICENSOR/i.test(line);
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: isLicensor ? "Licensor" : "Licensee",
      };
      if (isLicenseeUser) {
        if (isLicensor) {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Licensor";
          }
        } else {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Licensee";
          }
        }
      } else {
        if (isLicensor) {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Licensor";
          }
        } else {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Licensee";
          }
        }
      }
    }

    // 16. PROMOTER / ALLOTTEE
    if (/^(?:AND\s+)?(?:PROMOTER|ALLOTTEE)(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const isPromoter = /PROMOTER/i.test(line);
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: isPromoter ? "Promoter" : "Allottee",
      };
      if (isAllotteeUser) {
        if (isPromoter) {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Promoter";
          }
        } else {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Allottee";
          }
        }
      } else {
        if (isPromoter) {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Promoter";
          }
        } else {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Allottee";
          }
        }
      }
    }

    // 17. FRANCHISOR / FRANCHISEE
    if (/^(?:AND\s+)?(?:FRANCHISOR|FRANCHISEE)(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const isFranchisor = /FRANCHISOR/i.test(line);
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: isFranchisor ? "Franchisor" : "Franchisee",
      };
      if (isFranchiseeUser) {
        if (isFranchisor) {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Franchisor";
          }
        } else {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Franchisee";
          }
        }
      } else {
        if (isFranchisor) {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Franchisor";
          }
        } else {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Franchisee";
          }
        }
      }
    }

    // 18. 'of the First Part' / 'of the Other Part' or 'of the Second Part'
    if (/(?:of the First Part|of the One Part|of the Second Part|of the Other Part)/i.test(line) && !/FIRST PARTY|SECOND PARTY/i.test(line)) {
      const isFirst = /(?:of the First Part|of the One Part)/i.test(line);
      const target = line.replace(/,\s*hereinafter referred to as.*$/i, "");
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: isFirst ? "First Part" : "Second Part",
      };
      if (isFirstPartyUser) {
        if (isFirst) {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "First Part";
          }
        } else {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Second Part";
          }
        }
      } else {
        if (isFirst) {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "First Part";
          }
        } else {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Second Part";
          }
        }
      }
    }

    // 19. PRINCIPAL / AGENT
    if (/^(?:AND\s+)?(?:PRINCIPAL|AGENT)(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const isPrincipal = /PRINCIPAL/i.test(line);
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: isPrincipal ? "Principal" : "Agent",
      };
      if (isAgentUser) {
        if (isPrincipal) {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Principal";
          }
        } else {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Agent";
          }
        }
      } else {
        if (isPrincipal) {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Principal";
          }
        } else {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Agent";
          }
        }
      }
    }

    // 20. CONSIGNOR / CONSIGNEE
    if (/^(?:AND\s+)?(?:CONSIGNOR|CONSIGNEE)(?:\s*\([^)]*\))?\s*[:\-]?/i.test(line)) {
      const isConsignor = /CONSIGNOR/i.test(line);
      const target = getTargetText(line, nextLine);
      const parsed = {
        name: cleanName(target),
        address: extractAddress(rawCombined),
        role: isConsignor ? "Consignor" : "Consignee",
      };
      if (isConsigneeUser) {
        if (isConsignor) {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Consignor";
          }
        } else {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Consignee";
          }
        }
      } else {
        if (isConsignor) {
          if (!signatory.name) {
            signatory.name = parsed.name;
            signatory.address = parsed.address;
            signatory.role = "Consignor";
          }
        } else {
          if (!counterparty.name) {
            counterparty.name = parsed.name;
            counterparty.address = parsed.address;
            counterparty.role = "Consignee";
          }
        }
      }
    }
  }

  // Job title / position for employee
  if (isEmployeeUser && !signatory.title) {
    const posMatch = text.match(/engaged as\s+([^,\n]+?)(?:\s+at|\s*,|\s*\.)/i);
    if (posMatch) {
      signatory.title = posMatch[1].trim();
    }
  }

  // Premises for tenant
  if (isTenantUser && !signatory.address) {
    const premMatch = text.match(/(?:Apartment|Flat|Shop Unit)\s*#[^,\n]+,\s*[^,\n]+,\s*[^,\n]+(?:\s*-\s*\d{6})?/i);
    if (premMatch) {
      signatory.address = premMatch[0].trim();
    }
  }

  if (counterparty.name) {
    counterparty.shortName = counterparty.name
      .replace(/\s*(?:Private Limited|Pvt\.?\s*Ltd\.?|LLP|LLC|Inc\.?|Corporation|Corp\.?)\.?$/i, "")
      .trim();
    counterparty.isCompany = /(?:Limited|Ltd|LLP|Inc|Corporation|Corp|Technologies|Brands|Estates|Solutions|Interiors|Academy|Centre|NBFC|Bank|Finance|Builders|Developers|Promoters|Franchise|Logistics|Agency|Freight|Shipping)/i.test(counterparty.name);
  }

  return { counterparty, signatory };
}
