const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    profileImage: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    bio: { type: String, default: "" },
    settings: {
      theme: { type: String, enum: ["light", "dark"], default: "dark" },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        productUpdates: { type: Boolean, default: true }
      },
      privacy: {
        profileVisibility: { type: String, enum: ["public", "private"], default: "public" },
        showEmail: { type: Boolean, default: false },
        showPhone: { type: Boolean, default: false }
      },
      integrations: {
        openaiApiKey: { type: String, default: "" },
        githubConnected: { type: Boolean, default: false },
        slackConnected: { type: Boolean, default: false }
      }
    },
    role: { type: String, default: "User", enum: ["User", "Admin"] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
