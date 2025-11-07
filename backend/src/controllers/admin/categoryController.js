import { getAllCategories, createCategory, deleteCategory } from "../../models/categoryModel.js";

export async function getCategories(req, res) {
  try {
    const userId = req.user.id;
    const categories = await getAllCategories(userId);
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching categories", error });
  }
}

export async function addCategory(req, res) {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const insertId = await createCategory(userId, name, imagePath);
    return res.json({ message: "Category created", category_id: insertId });
  } catch (error) {
    return res.status(500).json({ message: "Error creating category", error });
  }
}

export async function removeCategory(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await deleteCategory(id, userId);
    return res.json({ message: "Category deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting category", error });
  }
}
