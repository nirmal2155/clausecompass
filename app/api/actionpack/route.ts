import { NextRequest, NextResponse } from "next/server";
import { buildActionPackPrompt } from "@/lib/prompts/actionpack";
import { callLLM } from "@/lib/llm";
import { ActionPackResult, ActionPackResultSchema, RiskFinding } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { findings, userRole, language = "en" } = body;

    const findingList: RiskFinding[] = findings || [];

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
      language: language as "en" | "hi" | "gu",
      userRole: userRole || "Tenant",
      findingsJson,
    });

    const fallbackActionPack = (): ActionPackResult => {
      if (language === "hi") {
        return {
          summary:
            "यह 11 महीने का residential lease agreement (किरायानामा) है जो Flat 402, Koramangala, Bangalore के लिए है। Tenant को हर महीने की 5 तारीख तक Rs. 45,000 का किराया और Rs. 4,50,000 की अग्रिम security deposit (अमानत राशि) देनी है। यह अनुबंध 1 अप्रैल 2026 से 11 महीने तक वैध है। सबसे महत्वपूर्ण ध्यान देने योग्य बात Clause 8 में दिया गया 6 महीने का strict lock-in period है, जिसमें जल्दी निकलने पर पूरी 4.5 लाख की deposit जब्त करने की शर्त है। इसके अलावा Clause 13 में किराया देर होने पर बिना कोर्ट जाए बिजली-पानी काटने का एकतरफा अधिकार मकान मालिक ने रखा है। Clause 14 में विवाद होने पर केवल मकान मालिक द्वारा नियुक्त मध्यस्थ (arbitrator) को ही फैसला करने की बात कही गई है।",
          checklist: [
            {
              task: "Pay monthly rent of Rs. 45,000",
              due: "on or before the 5th day of every calendar month",
              clauseId: "c-003",
            },
            {
              task: "Pay interest-free security deposit of Rs. 4,50,000",
              due: "upon signing this Agreement",
              clauseId: "c-004",
            },
            {
              task: "Report any major structural defects to Lessor",
              due: "within 15 days of possession",
              clauseId: "c-005",
            },
            {
              task: "Maintain tenancy without early termination during lock-in",
              due: "first 6 months from 1st April 2026",
              clauseId: "c-006",
            },
            {
              task: "Provide written termination notice if wishing to vacate after lock-in",
              due: "30 days prior written notice",
              clauseId: "c-007",
            },
            {
              task: "Pay painting and deep cleaning fee deduction",
              due: "upon vacating the premises",
              clauseId: "c-010",
            },
          ],
          lawyerQuestions: [
            {
              q: "अगर मुझे नौकरी या आपात स्थिति के कारण 4 महीने बाद शहर छोड़ना पड़े, तो क्या मकान मालिक पूरी Rs. 4,50,000 की राशि जब्त कर सकता है?",
              clauseId: "c-006",
              why: "Indian Contract Act की Section 74 के तहत दंडनीय forfeiture पर अदालतें रोक लगाती हैं।",
            },
            {
              q: "क्या कर्नाटक और Model Tenancy Act के नियमों के अनुसार 10 महीने का deposit मांगना अनुचित (unfair) है?",
              clauseId: "c-004",
              why: "Model Tenancy Act 2021 की Section 10 आवासीय लीज के लिए अधिकतम 2 महीने का किराया तय करती है।",
            },
            {
              q: "क्या मकान मालिक किराया 10 दिन देर होने पर पानी और बिजली का कनेक्शन काट सकता है?",
              clauseId: "c-011",
              why: "Section 23 essential services काटने को गैरकानूनी घोषित करती है।",
            },
            {
              q: "क्या Clause 14 में Consumer Court जाने का अधिकार त्यागना कानूनन मान्य है?",
              clauseId: "c-012",
              why: "Section 28 legal proceedings रोकने वाले क्लॉज को void मानती है।",
            },
            {
              q: "मकान मालिक बिना पूर्व सूचना के कभी भी घर में घुस सकता है, क्या यह निजता (privacy) का उल्लंघन है?",
              clauseId: "c-008",
              why: "कम से कम 24 घंटे का लिखित नोटिस मानक कानूनी प्रक्रिया है।",
            },
            {
              q: "Rs. 35,000 का painting deduction फ्लैट की स्थिति देखे बिना काटना क्या Consumer Protection Act के तहत चुनौती दिया जा सकता है?",
              clauseId: "c-010",
              why: "सामान्य wear and tear के अलावा अनुचित कटौती को रोका जा सकता है।",
            },
            {
              q: "15% वार्षिक किराया वृद्धि के लिए केवल 15 दिन का नोटिस देना क्या पर्याप्त है?",
              clauseId: "c-009",
              why: "मानक कानूनी अवधि 90 दिन की पूर्व सूचना मांगती है।",
            },
            {
              q: "क्या एकतरफा Arbitrator नियुक्ति को निष्पक्ष मध्यस्थता के लिए बदला जा सकता है?",
              clauseId: "c-012",
              why: "Supreme Court के Perkins Eastman फैसले के तहत unilateral appointment शून्य मानी जाती है।",
            },
          ],
          email: {
            subject: "Discussion on Draft Lease Agreement - Flat 402, Green Meadows",
            body: `Dear Mr. Sharma,\n\nThank you for sharing the draft lease agreement for Flat 402, Green Meadows. I am very excited about moving into the apartment.\n\nWhile reviewing the draft, my legal advisor highlighted three points that appear unusually burdensome, and I kindly request your consideration to make them balanced:\n\n1. Lock-in & Deposit Forfeiture (Clause 8): Currently, vacating within 6 months results in the complete forfeiture of the Rs. 4,50,000 deposit plus rent for remaining months. Could we revise this to a mutual 3-month lock-in, with 1 month notice or rent in lieu?\n2. Security Deposit (Clause 4): 10 months deposit is quite high. Could we agree to 3 to 4 months (Rs. 1,35,000 to Rs. 1,80,000), aligning with standard Model Tenancy Act guidance?\n3. Notice for Inspection and Essential Services (Clauses 10 & 13): Could we add standard language requiring 24 hours prior written notice before visits, and removing utility disconnection language?\n\nI look forward to discussing these brief points so we can finalize and execute the agreement smoothly.\n\nWarm regards,\nPriya Nair\n[Contact: +91 98450 12345]`,
          },
        };
      }

      if (language === "gu") {
        return {
          summary:
            "આ એક 11 મહિનાનો રહેણાંક ભાડા કરાર છે જે Flat 402, Koramangala, Bangalore માટે છે. Tenant એ દર મહિનાની 5 તારીખ સુધીમાં Rs. 45,000 ભાડું અને Rs. 4,50,000 સિક્યોરિટી ડિપોઝિટ ચૂકવવાની રહેશે. કરાર 1 એપ્રિલ 2026 થી 11 મહિના સુધી માન્ય રહેશે. સૌથી મહત્ત્વપૂર્ણ જોખમી મુદ્દો Clause 8 માં 6 મહિનાનો સખત lock-in period છે, જેમાં વહેલા નીકળવા પર આખી Rs. 4.5 લાખની ડિપોઝિટ જપ્ત કરવાની અને બાકીના મહિનાનું ભાડું વસૂલવાની જોગવાઈ છે. આ ઉપરાંત Clause 13 માં 10 દિવસ ભાડું મોડું થતાં જ પાણી અને વીજળી કાપવાનો એકતરફી અધિકાર માલિકે રાખ્યો છે.",
          checklist: [
            {
              task: "Pay monthly rent of Rs. 45,000",
              due: "on or before the 5th day of every calendar month",
              clauseId: "c-003",
            },
            {
              task: "Pay interest-free security deposit of Rs. 4,50,000",
              due: "upon signing this Agreement",
              clauseId: "c-004",
            },
            {
              task: "Lock-in period compliance",
              due: "first 6 months from 1st April 2026",
              clauseId: "c-006",
            },
            {
              task: "Termination notice after lock-in",
              due: "30 days prior written notice",
              clauseId: "c-007",
            },
          ],
          lawyerQuestions: [
            {
              q: "જો કોઈ કટોકટીમાં 4 મહિના પછી ફ્લેટ છોડવો પડે, તો શું મકાનમાલિક આખી Rs. 4,50,000 જપ્ત કરી શકે?",
              clauseId: "c-006",
              why: "Indian Contract Act ની Section 74 અનુસાર બિનજરૂરી દંડનીય જપ્તી માન્ય નથી.",
            },
            {
              q: "શું 10 મહિનાની ડિપોઝિટ Model Tenancy Act ના નિયમો વિરુદ્ધ છે?",
              clauseId: "c-004",
              why: "Section 10 રહેણાંક મકાન માટે મહત્તમ 2 મહિનાની મર્યાદા રાખે છે.",
            },
            {
              q: "શું કોર્ટ ગયા વિના પાણી કે વીજળી કાપવાનો અધિકાર કાયદેસર છે?",
              clauseId: "c-011",
              why: "Section 23 જરૂરી સેવાઓ અટકાવવાની મનાઈ કરે છે.",
            },
          ],
          email: {
            subject: "Discussion on Draft Lease Agreement - Flat 402, Green Meadows",
            body: `Dear Mr. Sharma,\n\nThank you for sharing the draft agreement. We are keen on moving in, but wish to make three terms fair:\n1. Lock-in clause (Clause 8): Request to reduce from 6 months to 3 months with 1 month notice.\n2. Security deposit (Clause 4): Request to reduce from 10 months to 3-4 months.\n3. Inspection (Clause 10): 24 hours prior written notice before entry.\n\nBest regards,\nPriya Nair`,
          },
        };
      }

      // Default English
      return {
        summary:
          "This document is an 11-month residential lease agreement for Flat 402 in Koramangala, Bangalore. The tenant owes Rs. 45,000 in monthly rent due by the 5th of each month, along with an upfront security deposit of Rs. 4,50,000. The term runs for 11 months beginning 1st April 2026, renewable upon mutually agreed terms. The single item most warranting immediate attention is Clause 8, which imposes an onerous 6-month lock-in period with full deposit forfeiture and continued rent liability. Additionally, Clause 13 permits unilateral disconnection of electricity and water upon 10 days of overdue rent without court order. Dispute resolution in Clause 14 purports to waive the tenant's statutory rights to approach civil or consumer courts.",
        checklist: [
          {
            task: "Pay monthly rent of Rs. 45,000",
            due: "on or before the 5th day of every calendar month",
            clauseId: "c-003",
          },
          {
            task: "Pay interest-free security deposit of Rs. 4,50,000",
            due: "upon signing this Agreement",
            clauseId: "c-004",
          },
          {
            task: "Report any major structural defects to Lessor",
            due: "within 15 days of possession",
            clauseId: "c-005",
          },
          {
            task: "Fulfill mandatory tenancy lock-in obligations",
            due: "first 6 months from 1st April 2026",
            clauseId: "c-006",
          },
          {
            task: "Serve written termination notice after lock-in period",
            due: "30 days prior written notice",
            clauseId: "c-007",
          },
          {
            task: "Pay fixed painting and deep cleaning charge",
            due: "upon vacating the premises",
            clauseId: "c-010",
          },
        ],
        lawyerQuestions: [
          {
            q: "Can the landlord legally forfeit the entire Rs. 4.5 lakh deposit and claim remaining months of rent if I must relocate during the lock-in period?",
            clauseId: "c-006",
            why: "Section 74 of the Indian Contract Act 1872 limits compensation to actual proven damage rather than punitive double forfeitures.",
          },
          {
            q: "Is the 10-month security deposit demand legally challengeable under Section 10 of the Model Tenancy Act 2021?",
            clauseId: "c-004",
            why: "The national statutory guideline caps residential deposits at two months' rent.",
          },
          {
            q: "Is Clause 13, authorizing the landlord to cut off water and electricity without judicial process, void under tenancy protection laws?",
            clauseId: "c-011",
            why: "Disconnection of essential services without Rent Court authorization is explicitly prohibited under Section 23 of the Model Tenancy Act.",
          },
          {
            q: "Is the waiver of rights to approach the Consumer Disputes Redressal Commission in Clause 14 legally enforceable?",
            clauseId: "c-012",
            why: "Section 28 of the Indian Contract Act declares agreements restraining legal proceedings void.",
          },
          {
            q: "Does unannounced landlord entry in Clause 10 violate my right to privacy and peaceful enjoyment as recognized by Indian courts?",
            clauseId: "c-008",
            why: "Standard statutory practice requires a minimum 24-hour advance written notice.",
          },
          {
            q: "Can the Rs. 35,000 painting deduction be contested as an unfair contract term under Section 2(46) of the Consumer Protection Act 2019?",
            clauseId: "c-010",
            why: "Deducting fixed charges regardless of actual wear and tear constitutes an arbitrary forfeiture.",
          },
          {
            q: "Is a 15-day notice period for a 15% rent escalation compliant with statutory tenancy provisions?",
            clauseId: "c-009",
            why: "Section 13 of the Model Tenancy Act mandates a 90-day advance notice for rent revision.",
          },
          {
            q: "Can a sole arbitrator appointed unilaterally by the Lessor be disqualified under Supreme Court arbitration rulings?",
            clauseId: "c-012",
            why: "The Supreme Court in Perkins Eastman held that an interested party cannot unilaterally appoint a sole arbitrator.",
          },
        ],
        email: {
          subject: "Draft Lease Agreement Review - Flat 402, Green Meadows",
          body: `Dear Mr. Sharma,\n\nThank you for preparing and sharing the draft residential lease agreement for Flat 402, Green Meadows. I am looking forward to moving in and appreciate your cooperation.\n\nIn reviewing the draft, there are three clauses that present substantial one-sided risk for a tenant, and I would be grateful if we could adjust them to standard balanced terms:\n\n1. Lock-in Period & Deposit Forfeiture (Clause 8): Currently, vacating early forfeits the entire Rs. 4,50,000 deposit and demands all remaining rent. I propose a mutual 3-month lock-in period, with 30 days written notice thereafter or 1 month rent in lieu.\n2. Security Deposit (Clause 4): 10 months rent (Rs. 4,50,000) is exceptionally high. Could we agree on 3 to 4 months rent (Rs. 1,35,000 to Rs. 1,80,000), which aligns more closely with Model Tenancy guidelines?\n3. Inspection & Essential Services (Clauses 10 & 13): I request that inspections be scheduled with at least 24 hours prior written notice, and that utility cut-off clauses be replaced with standard dispute mechanisms.\n\nPlease let me know if these reasonable adjustments work for you so we can finalize the agreement and proceed with execution.\n\nBest regards,\nPriya Nair\n[Tenant Contact: +91 98450 12345]`,
        },
      };
    };

    const { data } = await callLLM<ActionPackResult>({
      prompt,
      schema: ActionPackResultSchema,
      temperature: 0.4,
      mockFallback: fallbackActionPack,
    });

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
