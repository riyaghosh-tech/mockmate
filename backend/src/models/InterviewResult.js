const mongoose = require("mongoose");

const interviewResultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 10 },
    confidence: { type: Number, required: true, min: 0, max: 10 },
    communication: { type: Number, required: true, min: 0, max: 10 },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    suggestions: [{ type: String }],
    qaPairs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
        evaluation: {
          score: Number,
          confidence: Number,
          communication: Number
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewResult", interviewResultSchema);
