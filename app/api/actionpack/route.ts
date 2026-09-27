import { NextRequest, NextResponse } from "next/server";
import { buildActionPackPrompt } from "@/lib/prompts/actionpack";
import { callLLM } from "@/lib/llm";
import { ActionPackResult, ActionPackResultSchema, RiskFinding } from "@/lib/schema";
import { getCachedDocument } from "@/lib/cache";
import { extractContractParties } from "@/lib/parties";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      documentId,
      findings,
      userRole,
      language = "en",
      docType,
      filename,
      clauses = [],
      rawText = "",
    } = body;

    const role = userRole || "Signatory";
    const findingList: RiskFinding[] = findings || [];

    // Reconstruct full text if missing
    let fullText = rawText || "";
    if (!fullText && documentId) {
      const cached = getCachedDocument(documentId);
      if (cached?.rawText) {
        fullText = cached.rawText;
      }
    }
    if (!fullText && Array.isArray(clauses) && clauses.length > 0) {
      fullText = clauses.map((c: any) => `${c.heading || ""}\n${c.text || ""}`).join("\n\n");
    }

    const { counterparty, signatory } = extractContractParties(fullText, clauses, userRole || "Tenant");

    const cpName = counterparty.shortName || counterparty.name;
    const counterpartyInfo = cpName
      ? `${counterparty.name}${counterparty.address ? `, ${counterparty.address}` : ""}`
      : "";
    const signatoryInfo = signatory.name
      ? `${signatory.name}${signatory.title ? `, ${signatory.title}` : ""}${signatory.address ? `, ${signatory.address}` : ""}`
      : "";

    const findingsJson = JSON.stringify(
      findingList.map((f) => ({
        clauseId: f.clauseId,
        severity: f.severity,
        category: f.category,
        plainMeaning: f.plainMeaning,
        whyItMatters: f.whyItMatters,
        favours: f.favours,
        quotedSpan: f.quotedSpan,
      })),
      null,
      2
    );

    const prompt = buildActionPackPrompt({
      language: language as "en" | "hi",
      userRole: userRole || "Tenant",
      findingsJson,
      counterpartyInfo: counterpartyInfo || undefined,
      signatoryInfo: signatoryInfo || undefined,
    });

    const fallbackActionPack = (): ActionPackResult => {
      const highRisks = findingList.filter((f) => f.severity === "high");
      const negotiateList = findingList.filter((f) => f.severity === "negotiate");
      const role = userRole || "Signatory";
      const docTypeLower = (docType || "").toLowerCase();
      const filenameLower = (filename || "").toLowerCase();

      const isEmployment =
        role.toLowerCase().includes("employee") ||
        docTypeLower.includes("employ") ||
        filenameLower.includes("employ") ||
        filenameLower.includes("bond");
      const isCommercial =
        role.toLowerCase().includes("contractor") ||
        role.toLowerCase().includes("client") ||
        docTypeLower.includes("service") ||
        docTypeLower.includes("commercial") ||
        filenameLower.includes("freelance") ||
        filenameLower.includes("vendor") ||
        filenameLower.includes("interior");
      const isConsumer =
        role.toLowerCase().includes("consumer") ||
        role.toLowerCase().includes("student") ||
        docTypeLower.includes("consumer") ||
        docTypeLower.includes("saas") ||
        docTypeLower.includes("coaching") ||
        filenameLower.includes("saas") ||
        filenameLower.includes("coaching") ||
        filenameLower.includes("car");
      const isRental =
        role.toLowerCase().includes("tenant") ||
        role.toLowerCase().includes("landlord") ||
        docTypeLower.includes("tenan") ||
        docTypeLower.includes("lease") ||
        filenameLower.includes("rent");

      // 1. Dynamic Plain Language Summary (Language Aware)
      let summaryText = "";
      if (language === "hi") {
        if (isEmployment) {
          summaryText = `यह दस्तावेज़ ${role} के परिप्रेक्ष्य से तैयार किया गया रोज़गार अनुबंध (Employment Agreement) है जिसमें कुल ${findingList.length} शर्तों का विश्लेषण किया गया है। मुख्य ध्यान देने योग्य बिंदु: ${
            highRisks.map((h) => h.plainMeaning).slice(0, 3).join("। ") || "सर्विस बॉन्ड और गैर-प्रतिस्पर्धा (Non-Compete) प्रतिबंध।"
          }। भारतीय अनुबंध अधिनियम 1872 की धारा 27 के तहत रोज़गार समाप्ति के बाद लगाए गए गैर-प्रतिस्पर्धा क्लॉज़ भारतीय अदालतों में स्वतः शून्य (void ab initio) माने जाते हैं। इसके अलावा धारा 74 के तहत वास्तविक प्रशिक्षण खर्च साबित किए बिना भारी बॉन्ड की वसूली नहीं की जा सकती। हस्ताक्षर करने से पहले अपने वकील से बॉन्ड और नोटिस अवधि पर चर्चा करें।`;
        } else if (isCommercial) {
          summaryText = `यह स्वतंत्र सलाहकार / सेवा अनुबंध (Commercial Services Agreement) है जिसमें ${role} के अधिकारों का विश्लेषण किया गया है। प्रमुख चिंताजनक बिंदु: ${
            highRisks.map((h) => h.plainMeaning).slice(0, 3).join("। ") || "असीमित दायित्व (Unlimited Indemnity) और विलंबित भुगतान चक्र।"
          }। नेट-90 जैसे अत्यधिक विलंबित भुगतान चक्र और असीमित क्षतिपूर्ति दायित्व को सीमित करना आपके वित्तीय हित में आवश्यक है। हस्ताक्षर करने से पहले मील के पत्थर आधारित स्वीकृति और उचित किल-फी (kill fee) की मांग करें।`;
        } else if (isConsumer) {
          summaryText = `यह उपभोक्ता सेवा शर्तें (Consumer Terms of Service) हैं जिसमें उपभोक्ता अधिकारों का परीक्षण किया गया है। प्रमुख जोखिम बिंदु: ${
            highRisks.map((h) => h.plainMeaning).slice(0, 3).join("। ") || "100% गैर-वापसी योग्य भुगतान और डेटा का व्यावसायिक उपयोग।"
          }। उपभोक्ता संरक्षण अधिनियम 2019 की धारा 2(46) के अनुसार सेवा में कमी होने पर भी रिफंड न देना एकतरफा अनुचित व्यापार व्यवहार माना जाता है।`;
        } else if (isRental) {
          summaryText = `यह आवासीय किरायानामा (Residential Lease Agreement) है जिसमें किरायेदार के लिए कुल ${findingList.length} शर्तों का विश्लेषण किया गया है। सबसे महत्वपूर्ण ध्यान देने योग्य बातें हैं: ${
            highRisks.map((h) => h.plainMeaning).slice(0, 3).join("। ") || "लॉक-इन अवधि और सिक्योरिटी डिपॉजिट जब्ती।"
          }। मॉडल टेनेंसी एक्ट 2021 और भारतीय अनुबंध अधिनियम की धारा 74 के तहत अत्यधिक डिपॉजिट और एकतरफा बिजली-पानी काटने के अधिकार पर आपत्ति दर्ज की जा सकती है।`;
        } else {
          summaryText = `यह अनुबंध ${role} के परिप्रेक्ष्य से विश्लेषित किया गया है जिसमें ${findingList.length} प्रावधानों की समीक्षा की गई है। इसमें ${highRisks.length} उच्च-जोखिम (High Risk) और ${negotiateList.length} बातचीत योग्य बिंदु पाए गए हैं। मुख्य निष्कर्ष: ${
            highRisks.map((h) => h.plainMeaning).slice(0, 3).join("। ") || "दस्तावेज़ की सामान्य कानूनी शर्तें।"
          }। हस्ताक्षर करने से पहले वैधानिक सुरक्षा उपायों का मूल्यांकन करें।`;
        }
      } else {
        // English
        if (isEmployment) {
          summaryText = `This document is an Employment & Confidentiality Agreement evaluated from the perspective of the ${role}. The contract contains ${findingList.length} analyzed provisions, revealing ${highRisks.length} high-severity liabilities. The primary legal exposure is the post-employment non-compete restriction, which is void ab initio under Section 27 of the Indian Contract Act 1872, and the liquidated damages service bond governed by Section 74. Additionally, the broad intellectual property capture of personal inventions and unilateral notice waiver warrant careful review before signing.`;
        } else if (isCommercial) {
          summaryText = `This document is an Independent Contractor & Commercial Services Agreement for the ${role}. Analysis of ${findingList.length} provisions reveals ${highRisks.length} critical liabilities, prominently un-capped indemnification obligations and extended payment cycles (e.g. Net-90). Furthermore, provisions mandating unlimited revisions without pro-rata compensation expose the contractor to material scope creep. Propose milestone sign-offs and mutual termination remedies.`;
        } else if (isConsumer) {
          summaryText = `This document contains Consumer Terms of Service reviewed from the perspective of the ${role}. Analysis reveals ${highRisks.length} high-risk unfair contract terms under Section 2(46) of the Consumer Protection Act 2019, including 100% non-refundable fee structures, unilateral modification rights, and broad waivers of digital personal data protections under the DPDP Act 2023.`;
        } else if (isRental) {
          summaryText = `This is a residential lease agreement for the ${role}. Analysis of ${findingList.length} clauses highlights ${highRisks.length} critical liabilities, prominently the security deposit forfeiture upon early exit and mandatory deductions regardless of fair wear and tear. Section 74 of the Indian Contract Act limits recoveries to reasonable proven compensation, while Model Tenancy Act guidance contemplates two months of rent for residential deposits.`;
        } else {
          summaryText = `This agreement defines contractual obligations from the perspective of the ${role}. Analysis of ${findingList.length} clauses identifies ${highRisks.length} high-risk liabilities and ${negotiateList.length} negotiation points. The most critical items requiring attention are: ${
            highRisks.map((h) => `${h.category.toUpperCase()}: ${h.plainMeaning}`).slice(0, 3).join("; ") || "General contractual terms."
          }. Review statutory implications before signing.`;
        }
      }

      // 2. Dynamic Obligations Checklist (Language Aware)
      const checklistItems = (highRisks.length > 0 ? highRisks : findingList).slice(0, 6).map((f) => {
        let task = language === "hi"
          ? `क्लॉज़ दायित्वों की समीक्षा करें: ${f.plainMeaning.slice(0, 80)}`
          : `Review clause obligations: ${f.plainMeaning.slice(0, 80)}`;
        let due = language === "hi"
          ? (f.severity === "high" ? "अनुबंध पर हस्ताक्षर करने से पहले" : "मानक व्यावसायिक समयसीमा")
          : (f.severity === "high" ? "Prior to contract execution" : "Standard operational timeline");

        if (f.category === "termination") {
          task = language === "hi"
            ? "एग्जिट नोटिस और सर्विस बॉन्ड/जब्ती की देयता को स्पष्ट करें"
            : "Clarify exit notice & liquidated damages exposure";
          due = language === "hi" ? "नियोजित निकास से 30-60 दिन पहले" : "30-60 days before contemplated exit";
        } else if (f.category === "financial") {
          task = language === "hi"
            ? "भुगतान अनुसूची, इनवॉइसिंग चक्र और डिपॉजिट शर्तों का सत्यापन करें"
            : "Verify payment schedule, invoice cycles, and deposit terms";
          due = language === "hi" ? "हस्ताक्षर या पहले इनवॉइस पर" : "Upon signing or initial invoice submission";
        } else if (f.category === "ip") {
          task = language === "hi"
            ? "अपनी व्यक्तिगत बौद्धिक संपदा और पूर्व आविष्कारों को अनुबंध से अलग करें"
            : "Delineate prior personal intellectual property & inventions";
          due = language === "hi" ? "अनुबंध पर हस्ताक्षर करने से पहले" : "Prior to signing agreement";
        } else if (f.category === "dispute") {
          task = language === "hi"
            ? "विवाद समाधान स्थान और भारतीय अदालतों के अधिकार क्षेत्र की पुष्टि करें"
            : "Verify dispute resolution seat and statutory court access";
          due = language === "hi" ? "अनुबंध पर हस्ताक्षर करने से पहले" : "Prior to contract execution";
        }
        return {
          task,
          due,
          clauseId: f.clauseId,
        };
      });

      // 3. Dynamic Lawyer Questions (Language Aware)
      const questionsForLawyer = (highRisks.length > 0 ? highRisks : findingList).slice(0, 8).map((f) => {
        let q = language === "hi"
          ? `क्या दूसरी पार्टी इस शर्त को कानूनन लागू करवा सकती है: "${f.quotedSpan || f.plainMeaning.slice(0, 60)}"?`
          : `Can the counterparty legally enforce the clause stating "${f.quotedSpan || f.plainMeaning.slice(0, 70)}"?`;
        let why = language === "hi"
          ? (f.statuteHint ? `${f.statuteHint} के तहत समीक्षा आवश्यक है।` : "भारतीय वैधानिक सिद्धांतों के तहत समीक्षा आवश्यक है।")
          : (f.whyItMatters || f.statuteHint || "May be vulnerable to challenge under Indian statutory principles.");

        if (f.category === "ip" && (f.plainMeaning.toLowerCase().includes("non-compete") || f.plainMeaning.toLowerCase().includes("trade") || f.plainMeaning.toLowerCase().includes("restrain"))) {
          q = language === "hi"
            ? "क्या रोज़गार समाप्ति के बाद गैर-प्रतिस्पर्धा (Non-Compete) क्लॉज़ भारतीय अदालत में कानूनी रूप से लागू हो सकता है?"
            : "Is the post-employment non-compete clause legally enforceable in an Indian civil court?";
          why = language === "hi"
            ? "भारतीय अनुबंध अधिनियम 1872 की धारा 27 व्यापार, व्यवसाय या आजीविका पर लगाए गए सभी प्रतिबंधों को स्वतः शून्य (void ab initio) घोषित करती है।"
            : "Section 27 of the Indian Contract Act 1872 renders all agreements in restraint of trade, profession, or lawful business void.";
        } else if (f.category === "termination" && (f.plainMeaning.toLowerCase().includes("forfeit") || f.plainMeaning.toLowerCase().includes("bond") || f.plainMeaning.toLowerCase().includes("damage"))) {
          q = language === "hi"
            ? "क्या दूसरी पार्टी वास्तविक वित्तीय नुकसान साबित किए बिना पूरा बॉन्ड या डिपॉजिट जब्त कर सकती है?"
            : "Can the counterparty forfeit the entire deposit or penalty without proving actual financial damages?";
          why = language === "hi"
            ? "भारतीय अनुबंध अधिनियम 1872 की धारा 74 हर्जाने को केवल वास्तविक साबित नुकसान तक सीमित रखती है, दंडात्मक वसूली की अनुमति नहीं है।"
            : "Section 74 of the Indian Contract Act restricts liquidated damages to reasonable compensation for actual proven loss.";
        } else if (f.category === "financial" && (f.plainMeaning.toLowerCase().includes("refund") || f.plainMeaning.toLowerCase().includes("non-refundable"))) {
          q = language === "hi"
            ? "क्या 100% गैर-वापसी योग्य (Non-Refundable) फीस की शर्त को उपभोक्ता फोरम में चुनौती दी जा सकती है?"
            : "Can the absolute non-refundable fee clause be challenged before the Consumer Forum?";
          why = language === "hi"
            ? "उपभोक्ता संरक्षण अधिनियम 2019 की धारा 2(46) के तहत एकतरफा फीस जब्ती अनुचित अनुबंध शर्त (unfair contract term) मानी जाती है।"
            : "Section 2(46) Consumer Protection Act 2019 classifies unfair retention of fees as an unfair contract term.";
        } else if (f.category === "dispute" && (f.plainMeaning.toLowerCase().includes("arbitrator") || f.plainMeaning.toLowerCase().includes("court"))) {
          q = language === "hi"
            ? "क्या कंपनी द्वारा एकतरफा मध्यस्थ (Sole Arbitrator) की नियुक्ति कानूनन वैध है?"
            : "Is the counterparty's unilateral appointment of a sole arbitrator valid under Indian law?";
          why = language === "hi"
            ? "मध्यस्थता एवं सुलह अधिनियम की धारा 12(5) और सर्वोच्च न्यायालय के पर्किन्स ईस्टमैन निर्णय के अनुसार एकतरफा मध्यस्थ नियुक्त करना अवैध है।"
            : "Section 12(5) Arbitration Act and Supreme Court Perkins Eastman precedent invalidate unilateral arbitrator appointments.";
        }

        return {
          q,
          clauseId: f.clauseId,
          why,
        };
      });

      // 4. Dynamic Negotiation Email (Language & Party Aware)
      let emailGreeting = "";
      if (language === "hi") {
        if (cpName) {
          emailGreeting = counterparty.isCompany ? ` सादर ${cpName} टीम,` : ` सादर ${cpName} जी,`;
        } else {
          emailGreeting = isEmployment
            ? "सादर एचआर एवं प्रबंधन टीम,"
            : isCommercial
            ? "सादर क्लाइंट टीम,"
            : isRental
            ? "सादर मकान मालिक महोदय,"
            : "सादर महोदय / महोदया,";
        }
      } else {
        if (cpName) {
          emailGreeting = counterparty.isCompany ? `Dear ${cpName} Team,` : `Dear ${cpName},`;
        } else {
          emailGreeting = isEmployment
            ? "Dear Hiring Manager & HR Team,"
            : isCommercial
            ? "Dear Client Team,"
            : isRental
            ? "Dear Leasing Management,"
            : "Dear Counterparty,";
        }
      }

      // Dynamic Sign-off (Zero Brackets!)
      const signOffLines: string[] = [];
      if (signatory.name) {
        signOffLines.push(signatory.name);
        if (signatory.title) signOffLines.push(signatory.title);
        if (signatory.address) signOffLines.push(signatory.address);
      } else {
        signOffLines.push(
          language === "hi"
            ? `अधिकृत हस्ताक्षरकर्ता (${role})`
            : `Authorized Signatory (${role})`
        );
      }
      const signOff = signOffLines.join("\n");

      let emailSubject = language === "hi"
        ? `प्रारूप अनुबंध समीक्षा - संतुलित शर्तों पर चर्चा (${cpName ? `${cpName} / ` : ""}${docType || role})`
        : `Draft Agreement Review - Balanced Terms Discussion (${cpName ? `${cpName} / ` : ""}${docType || role})`;

      let topPoints = (highRisks.length > 0 ? highRisks : negotiateList).slice(0, 3).map((f, i) => {
        if (language === "hi") {
          return `${i + 1}. ${f.category.toUpperCase()} (क्लॉज़ ${f.clauseId}): वर्तमान में, "${f.quotedSpan || f.plainMeaning.slice(0, 60)}" का प्रावधान है। हमारा प्रस्ताव है कि इसे मानक पारस्परिक व्यावसायिक शर्तों के अनुसार संतुलित किया जाए।`;
        }
        return `${i + 1}. ${f.category.toUpperCase()} (Clause ${f.clauseId}): Currently, "${f.quotedSpan || f.plainMeaning.slice(0, 60)}". We propose adjusting this to standard mutual commercial terms.`;
      }).join("\n");

      let emailBody = "";
      if (language === "hi") {
        emailBody = `${emailGreeting.trim()}\n\n${cpName ? `${cpName} के साथ ` : ""}अनुबंध का मसौदा साझा करने के लिए धन्यवाद। हम आपके साथ काम करने और इस प्रक्रिया को सुचारू रूप से आगे बढ़ाने के लिए पूरी तरह उत्सुक हैं।\n\nप्रारूप की समीक्षा के दौरान हमारे विधिक सलाहकार ने कुछ ऐसे बिंदुओं की ओर ध्यान दिलाया है जो ${role} के दृष्टिकोण से काफी एकतरफा प्रतीत होते हैं। हम आपसे निम्नलिखित बिंदुओं पर विचार करने का विनम्र अनुरोध करते हैं:\n\n${topPoints || "1. पारस्परिक समाप्ति नोटिस और दायित्व की उचित सीमा तय करने का अनुरोध।"}\n\nकृपया हमें बताएं कि क्या हम इन उचित और व्यावहारिक संशोधनों पर संक्षेप में चर्चा कर सकते हैं ताकि हम अनुबंध को शीघ्र अंतिम रूप दे सकें।\n\nसधन्यवाद एवं सादर,\n${signOff}`;
      } else {
        emailBody = `${emailGreeting.trim()}\n\nThank you for sharing the draft agreement${cpName ? ` for our engagement with ${cpName}` : ""}. We are very enthusiastic about working together and moving forward smoothly.\n\nUpon reviewing the draft terms, our legal advisor highlighted a few points that appear unusually one-sided for our role as ${role}. We kindly request your consideration on the following reasonable adjustments:\n\n${topPoints || "1. Requesting mutual termination notice and standard liability caps."}\n\nPlease let us know if we can schedule a brief call to align on these balanced terms so we can finalize execution.\n\nWarm regards,\n${signOff}`;
      }

      return {
        summary: summaryText,
        checklist: checklistItems.length > 0 ? checklistItems : [
          { task: language === "hi" ? "हस्ताक्षर के साथ अनुबंध निष्पादित करें" : "Execute contract with signature", due: language === "hi" ? "प्रभावी तिथि" : "Effective Date", clauseId: "c-001" },
        ],
        lawyerQuestions: questionsForLawyer.length > 0 ? questionsForLawyer : [
          { q: language === "hi" ? "क्या सभी परिचालन दायित्व पारस्परिक हैं?" : "Are all operational obligations reciprocal?", clauseId: "c-001", why: language === "hi" ? "संतुलित संविदात्मक अधिकार सुनिश्चित करता है।" : "Ensures balanced contractual rights." },
        ],
        email: {
          subject: emailSubject,
          body: emailBody,
        },
      };
    };

    const { data } = await callLLM<ActionPackResult>({
      prompt,
      schema: ActionPackResultSchema,
      temperature: 0.4,
      mockFallback: fallbackActionPack,
    });

    // Guardrail: Eliminate any lingering bracketed placeholders if LLM returned them
    if (data?.email?.body) {
      let cleanedBody = data.email.body;
      if (signatory.name) {
        cleanedBody = cleanedBody.replace(/\[(?:Signatory Name|Your Name|Signatory|Full Name|Employee Name|Tenant Name|Contractor Name|Client Name|Student Name)\]/gi, signatory.name);
      }
      if (signatory.title) {
        cleanedBody = cleanedBody.replace(/\[(?:Title|Job Title|Designation|Your Title|Your Role)\]/gi, signatory.title);
      }
      if (signatory.address) {
        cleanedBody = cleanedBody.replace(/\[(?:Address|Contact Info|Contact Details|Phone|Email|Your Address|Your Contact Info)\]/gi, signatory.address);
      }
      if (counterparty.name) {
        cleanedBody = cleanedBody.replace(/\[(?:Counterparty Name|Client Name|Company Name|Landlord Name|Institute Name|Seller Name|Buyer Name|Other Party)\]/gi, counterparty.name);
      }
      cleanedBody = cleanedBody
        .replace(/\[(?:Signatory Name|Your Name|आपका नाम)\]/gi, signatory.name || `Authorized Signatory (${role})`)
        .replace(/\[(?:Contact Info|Contact Details|संपर्क विवरण)\]/gi, signatory.address || "");

      data.email.body = cleanedBody.trim();
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("ActionPack error:", err);
    return NextResponse.json(
      { error: "Failed to generate Action Pack: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
