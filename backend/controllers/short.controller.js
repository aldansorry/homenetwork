const shortService = require("../services/short.service");

const extractTopics = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.filter(Boolean).map((item) => String(item));
  }
  if (typeof payload === "string") {
    return payload
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

exports.renewShort = async (req, res) => {
  const topics = [
    ...extractTopics(req.body?.topics),
    ...extractTopics(req.query?.topics),
  ];

  try {
    const results = await shortService.renewShorts(topics);
    return res.json({
      status: "success",
      topics: results.topics,
      discovered: results.discovered,
      items: results.items,
    });
  } catch (err) {
    console.error("Renew short error:", err);
    return res.status(500).json({
      status: "error",
      message: err.message || "Gagal memperbarui short",
    });
  }
};
