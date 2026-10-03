// Used only by the explicitly selected adoption evaluation. Never contacts OpenRouter.
globalThis.fetch = async (url, init) => {
  if (url !== "https://openrouter.ai/api/alpha/decisions")
    throw new Error("Unexpected endpoint");
  const body = JSON.parse(init.body);
  const answers = Object.fromEntries(
    Object.entries(body.questions).map(([id, question]) => {
      const criteria = Object.keys(question.criteria ?? {});
      const labels = {
        relevant: "relevant",
        irrelevant: "irrelevant",
        uncertain: "uncertain",
        supported: "supported",
        contradicted: "contradicted",
        insufficient: "insufficient",
      };
      const choice = labels[id.split("-")[0]] ?? criteria[0];
      if (!criteria.includes(choice))
        throw new Error("Fixture question mismatch");
      return [id, { type: "choice", choice }];
    }),
  );
  return Response.json({
    model: "typesafe/jev-1.13",
    answers,
    usage: { input_tokens: 0, output_tokens: 0 },
  });
};
