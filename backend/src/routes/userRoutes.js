const express = require("express");
const bcrypt = require("bcryptjs");
const authMiddleware = require("../middleware/authMiddleware");
const InterviewResult = require("../models/InterviewResult");
const User = require("../models/User");

const router = express.Router();

router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, profileImage, phone, location, bio } = req.body;
    
    // Build update object
    const updateFields = {};
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      updateFields.name = trimmedName;
    }
    if (profileImage !== undefined) updateFields.profileImage = profileImage;
    if (phone !== undefined) updateFields.phone = phone;
    if (location !== undefined) updateFields.location = location;
    if (bio !== undefined) updateFields.bio = bio;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No profile fields provided for update" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/settings", authMiddleware, async (req, res) => {
  try {
    const { theme, notifications, privacy, integrations } = req.body;
    const updateFields = {};

    if (theme !== undefined) {
      if (!["light", "dark"].includes(theme)) {
        return res.status(400).json({ message: "Invalid theme value" });
      }
      updateFields["settings.theme"] = theme;
    }

    if (notifications !== undefined) {
      if (notifications.email !== undefined) updateFields["settings.notifications.email"] = Boolean(notifications.email);
      if (notifications.push !== undefined) updateFields["settings.notifications.push"] = Boolean(notifications.push);
      if (notifications.productUpdates !== undefined) {
        updateFields["settings.notifications.productUpdates"] = Boolean(notifications.productUpdates);
      }
    }

    if (privacy !== undefined) {
      if (privacy.profileVisibility !== undefined) {
        if (!["public", "private"].includes(privacy.profileVisibility)) {
          return res.status(400).json({ message: "Invalid profile visibility value" });
        }
        updateFields["settings.privacy.profileVisibility"] = privacy.profileVisibility;
      }
      if (privacy.showEmail !== undefined) updateFields["settings.privacy.showEmail"] = Boolean(privacy.showEmail);
      if (privacy.showPhone !== undefined) updateFields["settings.privacy.showPhone"] = Boolean(privacy.showPhone);
    }

    if (integrations !== undefined) {
      if (integrations.openaiApiKey !== undefined) {
        updateFields["settings.integrations.openaiApiKey"] = String(integrations.openaiApiKey || "").trim();
      }
      if (integrations.githubConnected !== undefined) {
        updateFields["settings.integrations.githubConnected"] = Boolean(integrations.githubConnected);
      }
      if (integrations.slackConnected !== undefined) {
        updateFields["settings.integrations.slackConnected"] = Boolean(integrations.slackConnected);
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No settings fields provided for update" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/account", authMiddleware, async (req, res) => {
  try {
    await InterviewResult.deleteMany({ userId: req.user.id });
    const deletedUser = await User.findByIdAndDelete(req.user.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "Account deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/history", authMiddleware, async (req, res) => {
  try {
    const history = await InterviewResult.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/history", authMiddleware, async (req, res) => {
  try {
    const payload = req.body;
    const result = await InterviewResult.create({
      ...payload,
      userId: req.user.id
    });
    return res.status(201).json({ result });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
