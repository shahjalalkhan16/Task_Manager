const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const authenticateToken = require("../../middleware/auth");
const Task = require("../../models/Task");

router.post(
  "/",
  [authenticateToken, [body("title", "title is required").notEmpty()]],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const id = req.user.id;
      const taskObj = {
        title: req.body.title,
        desc: req.body.desc ?? "",
        userId: id
      };
      const task = new Task(taskObj);
      await task.save();
      res.status(201).json(task);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Something is wrong" });
    }
  }
);

router.get("/", authenticateToken, async (req, res) => {
  try {
    const id = req.user.id;
    const task = await Task.find({ userId: id });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Something is wrong" });
  }
});

router.put(
  "/status/:id",
  [
    authenticateToken,
    [
      body("status", "status is required").notEmpty(),
      body("status", "give your valid status").isIn([
        "to-do",
        "in-progress",
        "done",
      ]),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const id = req.params.id;
      const userId = req.user.id;

      const status = req.body.status;
      const task = await Task.findOneAndUpdate(
        { _id: id, userId: userId },
        { status: status },
        { new: true }
      );
      if (task) {
        res.json(task);
      } else {
        res.status(404).json({ message: "Task not found" });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Something is wrong" });
    }
  }
);

router.put(
  "/:id",
  [
    authenticateToken,
    [
      body("status", "give your valid status").isIn([
        "to-do",
        "in-progress",
        "done",
      ]),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const id = req.params.id;
      const userId = req.user.id;

      const body = req.body;
      const task = await Task.findOneAndUpdate(
        { _id: id, userId: userId },
        body,
        { new: true }
      );
      if (task) {
        res.json(task);
      } else {
        res.status(404).json({ message: "Task not found" });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Something is wrong" });
    }
  }
);

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const task = await Task.findOne({ _id: id, userId: userId });
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something is wrong" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const task = await Task.findOneAndDelete({ _id: id, userId: userId });
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something is wrong" });
  }
});

module.exports = router;
