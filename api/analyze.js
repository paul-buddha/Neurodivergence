export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { name, type, scores, answers } = req.body;
  if (!type || !scores || !answers) return res.status(400).json({ error: "Missing required fields" });

  const ADHD_QUESTIONS = [
    { id: "a1", domain: "Inattention", text: "I have difficulty getting started on tasks that require sustained mental effort." },
    { id: "a2", domain: "Inattention", text: "I lose focus mid-task and drift into something else entirely." },
    { id: "a3", domain: "Inattention", text: "I struggle to finish the final details of a project once the interesting parts are done." },
    { id: "a4", domain: "Inattention", text: "I miss details or make careless mistakes on tasks." },
    { id: "a5", domain: "Inattention", text: "I misplace things I need regularly." },
    { id: "a6", domain: "Inattention", text: "I forget appointments, obligations, or things people have asked me to do." },
    { id: "a7", domain: "Inattention", text: "Sounds, movement, or activity nearby pull my attention away from what I am trying to do." },
    { id: "a8", domain: "Inattention", text: "I avoid or put off tasks that require a lot of concentration." },
    { id: "a9", domain: "Inattention", text: "I have difficulty organising tasks, projects, or my physical environment." },
    { id: "a10", domain: "Hyperactivity / Impulsivity", text: "I feel restless or physically unable to sit still for extended periods." },
    { id: "a11", domain: "Hyperactivity / Impulsivity", text: "I feel internally driven like a motor is running even when I want to relax." },
    { id: "a12", domain: "Hyperactivity / Impulsivity", text: "I talk a lot, or find it hard to stop talking once I have started." },
    { id: "a13", domain: "Hyperactivity / Impulsivity", text: "I interrupt others or blurt out answers before they have finished their sentence." },
    { id: "a14", domain: "Hyperactivity / Impulsivity", text: "I have difficulty waiting my turn in lines, conversations, or group settings." },
    { id: "a15", domain: "Hyperactivity / Impulsivity", text: "I make quick decisions without fully thinking through the consequences." },
    { id: "a16", domain: "Hyperactivity / Impulsivity", text: "Even in free time, I find it hard to truly relax or switch off." },
    { id: "a17", domain: "Hyperactivity / Impulsivity", text: "I need to move, tapping, fidgeting, pacing, to think clearly or self-regulate." },
    { id: "a18", domain: "Hyperactivity / Impulsivity", text: "I act on impulse in ways I later regret." },
  ];
  const AUTISM_QUESTIONS = [
    { id: "au1", domain: "Social Communication", text: "Social situations leave me mentally depleted, even when I enjoy the people involved." },
    { id: "au2", domain: "Social Communication", text: "I find it difficult to understand the unspoken rules of social interaction." },
    { id: "au3", domain: "Social Communication", text: "I take things literally and sometimes miss sarcasm, metaphors, or implied meaning." },
    { id: "au4", domain: "Social Communication", text: "Small talk feels pointless or unnecessarily draining to navigate." },
    { id: "au5", domain: "Social Communication", text: "I feel like I am performing a role in social situations rather than being naturally myself." },
    { id: "au6", domain: "Social Communication", text: "Maintaining eye contact is uncomfortable, forced, or cognitively demanding." },
    { id: "au7", domain: "Social Communication", text: "I have been told I seem blunt, too direct, or accidentally rude." },
    { id: "au8", domain: "Sensory Processing", text: "Certain sounds distress me far more than they do others." },
    { id: "au9", domain: "Sensory Processing", text: "Specific textures are intolerable for me." },
    { id: "au10", domain: "Sensory Processing", text: "Bright, flickering, or harsh lighting is uncomfortable or physically overwhelming." },
    { id: "au11", domain: "Sensory Processing", text: "Crowded or noisy environments feel genuinely overwhelming." },
    { id: "au12", domain: "Sensory Processing", text: "Strong smells can dominate my attention or make environments unbearable." },
    { id: "au13", domain: "Routines & Patterns", text: "Unexpected changes to plans cause me significant distress or anxiety." },
    { id: "au14", domain: "Routines & Patterns", text: "I have specific ways I like things done and feel unsettled when that is disrupted." },
    { id: "au15", domain: "Routines & Patterns", text: "I become intensely absorbed in specific topics or interests for extended periods." },
    { id: "au16", domain: "Routines & Patterns", text: "I notice patterns, sequences, or details in things that others tend to overlook." },
    { id: "au17", domain: "Routines & Patterns", text: "I prefer knowing exactly what to expect." },
    { id: "au18", domain: "Self & Emotional Awareness", text: "I have difficulty identifying or naming what I am feeling in the moment." },
    { id: "au19", domain: "Self & Emotional Awareness", text: "I have had to consciously study and learn social behaviours that seem automatic for others." },
    { id: "au20", domain: "Self & Emotional Awareness", text: "I find it easier to express myself through writing, art, or structured formats than verbal conversation." },
  ];
  const OPTIONS_MAP = ["Never","Rarely","Sometimes","Often","Always"];
  const allQuestions = type === "adhd" ? ADHD_QUESTIONS : type === "autism" ? AUTISM_QUESTIONS : [...ADHD_QUESTIONS, ...AUTISM_QUESTIONS];
  const TYPE_LABELS = { adhd: "ADHD", autism: "Autism Spectrum", audhd: "Autism + ADHD (AuDHD)" };
  const highItems = allQuestions.filter(q => (answers[q.id] ?? 0) >= 3).map(q => "- " + q.text + " (" + OPTIONS_MAP[answers[q.id]] + ")").slice(0, 10).join("\n");
  const domainSummary = Object.entries(scores.domains).map(([d,v]) => d + ": " + Math.round((v.total/v.max)*100) + "%").join(", ");

  const prompt = "You are a compassionate neurodivergence specialist reviewing a self-assessment result. The person is " + (name || "this individual") + ". Assessment: " + (TYPE_LABELS[type] || type) + ". Overall: " + scores.pct + "%. Domains: " + domainSummary + ". High responses:\n" + (highItems || "None notably high") + "\n\nWrite a warm, empathetic 4-paragraph personal analysis. Address them as " + (name || "friend") + ". Never say they have a condition - use pattern language. Frame neurodivergence as neurological variation not deficit. Note this is not a clinical diagnosis. Flowing prose only, no headers or bullets.";

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
    });
    if (!anthropicRes.ok) { const e = await anthropicRes.json(); return res.status(502).json({ error: "AI unavailable", detail: e }); }
    const data = await anthropicRes.json();
    return res.status(200).json({ analysis: data.content?.[0]?.text ?? "" });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
