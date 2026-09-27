import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { checklist, filename = "document" } = body;

    const items = (checklist || []).filter(
      (item: any) =>
        item.due &&
        !item.due.toLowerCase().includes("no deadline stated") &&
        !item.due.toLowerCase().includes("immediate")
    );

    const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ClauseCompass//Indian Legal Deadlines//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    function parseRelativeDate(due: string, idx: number): Date {
      const target = new Date();
      const lower = due.toLowerCase();
      
      const daysMatch = lower.match(/(\d+)\s*days?/);
      const weeksMatch = lower.match(/(\d+)\s*weeks?/);
      const monthsMatch = lower.match(/(\d+)\s*months?/);

      if (daysMatch) {
        target.setDate(target.getDate() + parseInt(daysMatch[1], 10));
      } else if (weeksMatch) {
        target.setDate(target.getDate() + parseInt(weeksMatch[1], 10) * 7);
      } else if (monthsMatch) {
        target.setMonth(target.getMonth() + parseInt(monthsMatch[1], 10));
      } else if (lower.includes('before signing') || lower.includes('immediately')) {
        // Keep current date
      } else {
        // Fallback
        target.setDate(target.getDate() + (idx + 1) * 7);
      }
      return target;
    }

    items.forEach((item: any, idx: number) => {
      // Create event date offset from current date
      const targetDate = parseRelativeDate(item.due || '', idx);
      const dateStr = targetDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:clausecompass-${Date.now()}-${idx}@clausecompass.app`,
        `DTSTAMP:${now}`,
        `DTSTART:${dateStr}`,
        `DTEND:${dateStr}`,
        `SUMMARY:Legal Obligation: ${item.task.slice(0, 60)}`,
        `DESCRIPTION:Contractual Obligation (Clause ${item.clauseId}):\\n${item.task}\\nStated Timing: ${item.due}\\n\\nPrepared by ClauseCompass. Requires factual confirmation.`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    });

    icsContent.push("END:VCALENDAR");

    const finalIcs = icsContent.join("\r\n");

    return new NextResponse(finalIcs, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9]/g, "_")}_deadlines.ics"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "Failed to generate ICS: " + err.message }, { status: 500 });
  }
}
