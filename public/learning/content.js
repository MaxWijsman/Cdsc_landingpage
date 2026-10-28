((Q) => {
  "use strict";
  const choice = (id, label, quality) => ({ id, label, quality });
  const ingredients = (task, context, audience, constraint) => ({
    task: [choice("task-good", task, "good"), choice("task-weak", "Just write something about the request", "weak"), choice("task-unsafe", "Promise whatever resolves the problem", "unsafe")],
    context: [choice("context-good", context, "good"), choice("context-weak", "Add unrelated company history", "weak"), choice("context-none", "Leave out the background", "weak")],
    audience: [choice("audience-good", audience, "good"), choice("audience-weak", "Write to anyone", "weak"), choice("audience-wrong", "Write as a casual social post", "weak")],
    tone: [choice("tone-good", "Professional, warm and respectful", "good"), choice("tone-weak", "Be blunt and confrontational", "weak"), choice("tone-vague", "Use whatever tone you prefer", "weak")],
    constraints: [choice("constraints-good", constraint, "good"), choice("constraints-weak", "Do not check which commitments are allowed", "weak"), choice("constraints-unsafe", "Invent a policy or deadline to sound confident", "unsafe")],
    format: [choice("format-good", "Short email with a subject line", "good"), choice("format-weak", "A long essay", "weak"), choice("format-vague", "No output format specified", "weak")],
  });
  const inbox = [
    {
      id: "discount", title: "A discount dilemma", brief: "A fictional client asks for a 40% discount. You cannot approve it. Draft a respectful reply that keeps the relationship open.",
      ingredients: ingredients("Decline the requested 40% discount", "Maintain a positive client relationship", "An existing business client", "Do not promise an unauthorized discount"),
      subject: "Your discount request", greeting: "Dear Rowan,", goodBody: "Thank you for your request. We cannot offer the 40% discount requested.", positive: "We value our working relationship and would welcome a conversation about other authorized options.", unsafe: "We can approve your 40% discount immediately.", invented: "Our company policy guarantees a 40% discount to all existing clients.",
    },
    {
      id: "delay", title: "A deadline has moved", brief: "A fictional project is delayed by a supplier. A new delivery date is not confirmed. Update colleagues clearly without inventing a deadline.",
      ingredients: ingredients("Explain the delay and what happens next", "A supplier delay; a new date is not confirmed", "Colleagues waiting for the project", "Do not invent a deadline or make new commitments"),
      subject: "Project delivery update", greeting: "Hello team,", goodBody: "A supplier delay has affected our project. We do not yet have a confirmed delivery date.", positive: "We will share an update when the supplier confirms the schedule. Thank you for your patience.", unsafe: "Delivery is guaranteed by Friday, even though the supplier has not confirmed it.", invented: "Our policy guarantees that supplier delays never affect delivery dates.",
    },
  ];
  const delegation = [
    { id: "titles", task: "Brainstorm five titles for an internal presentation.", context: "Only public topic information is needed. Use an approved tool.", answer: "help", why: "AI is useful for low-risk idea generation. You choose which ideas to use." },
    { id: "notes", task: "Summarize non-sensitive meeting notes.", context: "The selected enterprise tool is approved for these notes.", answer: "help", why: "AI can organize permitted information. Check that the summary matches your notes." },
    { id: "outline", task: "Suggest improvements to a presentation outline.", context: "The outline contains public, non-sensitive information.", answer: "help", why: "AI can suggest structure and alternatives while you retain editorial judgment." },
    { id: "hiring", task: "Make the final hiring decision between two candidates.", context: "This task is the employment decision itself, not drafting interview questions.", answer: "human", critical: true, why: "The accountable human hiring process must make the final decision." },
    { id: "contract", task: "Make a legally binding contractual commitment.", context: "This task authorizes the commitment; it is not merely drafting wording.", answer: "human", critical: true, why: "An authorized person must make the commitment. AI does not hold that authority." },
    { id: "customer", task: "Draft a reply to an unhappy customer.", context: "Use an approved tool and permitted facts. A colleague will send the final response.", answer: "review", why: "AI can draft; a person must review facts, tone and any commitments before sending." },
    { id: "plan", task: "Create a first draft of a project plan.", context: "The project owner must validate scope, resources and dates.", answer: "review", why: "AI can outline a plan. The owner must check whether its assumptions and deadlines are realistic." },
    { id: "forecast", task: "Help check a financial forecast.", context: "An approved tool may assist; an accountable reviewer must verify the data, calculations and conclusions.", answer: "review", why: "AI may assist the review, but it cannot establish that a forecast is reliable on its own." },
  ];
  const repair = [
    { id: "project", title: "A status report without a point", goal: "Give management a short, evidence-based status update with a recommendation.", source: "Project Cedar: testing is two days behind plan. A supplier fix is outstanding. Recommendation: assign an owner to confirm the fix before setting a new launch date.", facts: "Testing is two days behind plan.", risk: "The supplier fix is still outstanding.", next: "Assign an owner to confirm the fix before setting a new launch date.", original: "There have been various activities and discussions. Many things are progressing in different ways, and the team has been busy with a number of items. Overall, this is a detailed and complicated situation requiring more discussions." },
    { id: "service", title: "The real issue is buried", goal: "Help management prioritize the documented customer-service problem.", source: "A fictional service team has a backlog of 18 cases. Two cases need a specialist review. Recommendation: assign specialist capacity before promising resolution dates.", facts: "The service backlog contains 18 cases.", risk: "Two cases need specialist review.", next: "Assign specialist capacity before promising resolution dates.", original: "The service area has a broad variety of things going on and a lot of different opinions. Everybody is working hard and would like the situation to be better. There are many possibilities and it might be helpful to think about things some more." },
  ];
  const repairActions = [
    { id: "structure", label: "Three concise bullets; retain verified facts", why: "Concise structure makes the source facts easier to use." },
    { id: "next", label: "Lead with the recommendation and next step", why: "A specific next step turns a description into something actionable." },
    { id: "audience", label: "For management: prioritize documented risks", why: "Audience and risk context make the summary decision-relevant." },
    { id: "cut", label: "Make it as short as possible", why: "Shorter is not always better: this removes important risks and the next step." },
    { id: "stats", label: "Add impressive statistics", why: "The source provides no support for invented statistics." },
    { id: "complex", label: "Make it more complicated", why: "Extra complexity makes the draft harder to use." },
  ];
  const hunter = [
    { id: "service-report", title: "A convincing service briefing", evidence: "Fictional quarterly report: satisfaction moved from 70% to 75%. Tickets moved from 1,000 to 880. No study identified what caused the changes.", corrected: "Satisfaction increased by five percentage points and tickets fell by 12%. The cause of these changes is not established.", claims: [
      { id: "satisfaction", text: "Satisfaction rose by five percentage points.", answer: "supported", why: "75% minus 70% is five percentage points." },
      { id: "tickets", text: "Support tickets fell by 40%.", answer: "contradicted", why: "A fall from 1,000 to 880 is 12%, not 40%." },
      { id: "cause", text: "The chatbot caused the improvement.", answer: "verify", why: "The report contains no causal analysis. Unsupported does not mean proven false." },
    ] },
    { id: "project-report", title: "A confident project update", evidence: "Fictional project ledger: budget 120,000; actual cost 126,000. The milestone log confirms 9 of 10 delivered. No industry benchmark is supplied.", corrected: "The project cost 5% more than budget and delivered nine of ten milestones. Its industry ranking has not been established.", claims: [
      { id: "budget", text: "The project finished under budget.", answer: "contradicted", why: "Actual cost exceeded the budget by 6,000, or 5%." },
      { id: "milestones", text: "Nine out of ten milestones were delivered.", answer: "supported", why: "The milestone log directly supports this statement." },
      { id: "ranking", text: "The project leads the industry.", answer: "verify", why: "An industry comparison is needed before making this claim." },
    ] },
  ];
  const danger = [
    { id: "complaint", title: "Clean up the complaint", brief: "Summarize the issue using the fictional enterprise assistant. The complaint is internal information; personal identifiers are unnecessary.", classification: "internal", preferred: "enterprise", segments: [
      { id: "name", text: "Name: Mila Example", dataClass: "personal", remove: true },
      { id: "phone", text: "Phone: 000-TRAINING-ONLY", dataClass: "personal", remove: true },
      { id: "email", text: "Email: mila@example.invalid", dataClass: "personal", remove: true },
      { id: "account", text: "Account: DEMO-0000", dataClass: "personal", remove: true },
      { id: "issue", text: "The delivery arrived late.", dataClass: "internal", remove: false },
      { id: "request", text: "The customer requests a delivery update.", dataClass: "internal", remove: false },
    ] },
    { id: "restricted-plan", title: "Redaction is not permission", brief: "A colleague wants to send a restricted project note to a public assistant. The document remains restricted after removing identifiers.", classification: "restricted", preferred: "decline", segments: [
      { id: "owner", text: "Owner: Rowan Example", dataClass: "personal", remove: true },
      { id: "credential", text: "Key: TRAINING-NOT-A-REAL-KEY", dataClass: "secret", remove: true },
      { id: "project", text: "Restricted: unreleased Project Lumen plan.", dataClass: "restricted", remove: false },
      { id: "decision", text: "The plan requires an approved non-AI process.", dataClass: "internal", remove: false },
    ] },
  ];
  Q.content = {
    version: 1,
    order: ["inbox", "delegate", "repair", "hunter", "data-danger"],
    meta: {
      inbox: { title: "Inbox Inferno", skill: "Build a useful prompt", duration: "2–3 min", takeaway: "Tell AI what to achieve, who it is for, and which constraints matter." },
      delegate: { title: "Delegate or Don’t?", skill: "Choose where AI can help", duration: "2 min", takeaway: "AI can assist. Accountability and final authority stay with people." },
      repair: { title: "Fix My AI!", skill: "Improve the first draft", duration: "2–3 min", takeaway: "Give specific feedback and preserve the facts that matter." },
      hunter: { title: "Hallucination Hunter", skill: "Follow the evidence", duration: "2–3 min", takeaway: "Confidence is not evidence. Check important claims against sources." },
      "data-danger": { title: "Data Danger", skill: "Protect information", duration: "2 min", takeaway: "Check the tool, the data rules, and what information is actually needed." },
    },
    slots: ["task", "context", "audience", "tone", "constraints", "format"],
    inbox, delegation, repair, repairActions, hunter, danger,
    categories: [{ id: "help", label: "AI Can Help" }, { id: "human", label: "Human Decision" }, { id: "review", label: "AI + Human Review" }],
    verdicts: [{ id: "supported", label: "Supported" }, { id: "verify", label: "Needs verification" }, { id: "contradicted", label: "Contradicted" }],
    workflows: [{ id: "enterprise", label: "Training Enterprise Assistant" }, { id: "public", label: "Training Public Assistant" }, { id: "decline", label: "Use an approved non-AI process" }],
    policy: { label: "Fictional training rules — follow your organisation’s policy at work.", allowed: { enterprise: ["public", "internal"], public: ["public"] } },
  };
})(window.CDSCLearning = window.CDSCLearning || {});
