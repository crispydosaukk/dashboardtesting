// backend/controllers/admin/SettingsController.js
import {
  getSettingsModel,
  upsertSettingsModel,
} from "../../models/SettingsModel.js";

/**
 * GET /settings
 */
export const getSettings = async (req, res) => {
  try {
    const settings = await getSettingsModel();

    return res.json({
      status: 1,
      message: "Settings fetched successfully",
      data: settings,
    });
  } catch (err) {
    console.error("getSettings error:", err);
    return res.status(500).json({
      status: 0,
      message: "Failed to fetch settings",
    });
  }
};

/**
 * POST /settings
 * Body: { signup_flat_amount, referral_flat_amount, minimum_order }
 */
export const saveSettings = async (req, res) => {
  try {
    const {
      signup_flat_amount,
      referral_flat_amount,
      minimum_order,
    } = req.body || {};

    const updated = await upsertSettingsModel({
      signup_flat_amount,
      referral_flat_amount,
      minimum_order,
    });

    return res.json({
      status: 1,
      message: "Settings saved successfully",
      data: updated,
    });
  } catch (err) {
    console.error("saveSettings error:", err);
    return res.status(500).json({
      status: 0,
      message: "Failed to save settings",
    });
  }
};
