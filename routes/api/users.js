const express = require('express')
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const authenticateToken = require("../../middleware/auth");

router.post(
    "/", [
        body("fname", "fname is required").notEmpty(),
        body("lname", "lname is required").notEmpty(),
        body("email", "Please enter your valid email").notEmpty().isEmail(),
        body("age", "age is required").optional().isNumeric(),
        body("password", "Please enter a password with 6 or more")
        .isLength({ min: 6 })
        .isAlphanumeric(),
    ],
    async(req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(req.body.password, salt);
            const password = hash;
            const userObj = {
                fname: req.body.fname,
                lname: req.body.lname,
                email: req.body.email,
                age: req.body.age,
                password: password,
            };
            const user = new User(userObj);
            await user.save();
            res.status(201).json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Something is wrong" });
        }
    }
);


/**
 * @author Shahjalal
 * @desc login a user
 * @params email,password,type,refresh
 * @return {accessToken, refreshToken,user}
 */
router.post(
    "/login", [
        body("type", "type is required").notEmpty(),

        body("type", "type must be email or refresh").isIn(["email", "refresh"]),
    ],
    async(req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const { email, password, type, refreshToken } = req.body;

            if (type == "email") {
                await handleEmailLogin(email, res, password);
            } else {
                handleRefreshLogin(refreshToken, res);
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Something is wrong with the server" });
        }
    }
);

router.get("/profile", authenticateToken, async(req, res) => {

    try {
        const id = req.user.id;
        const user = await User.findById(id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something is wrong" });
    }
});

router.get("/", async(req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Something is wrong" });
    }
});

router.get("/:id", authenticateToken, async(req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findById(id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something is wrong" });
    }
});

router.put("/:id", authenticateToken, async(req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        const user = await User.findByIdAndUpdate(id, body, { new: true });
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something is wrong" });
    }
});

router.delete("/:id", authenticateToken, async(req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findByIdAndDelete(id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something is wrong" });
    }
});

module.exports = router;


/**
 * @author Shahjalal
 * @desc handle refreshToken login
 * @params refreshToken
 * @return {user}
 */
function handleRefreshLogin(refreshToken, res) {
    if (!refreshToken) {
        res.status(401).json({ message: "Refresh token is not define" });
    } else {
        jwt.verify(refreshToken, process.env.JWT_SECRET, async(err, payload) => {
            if (err) {
                res.status(401).json({ message: "Unauthorized" });
            } else {
                const id = payload.id;
                const user = await User.findById(id);
                if (!user) {
                    res.status(401).json({ message: "Unauthorized" });
                } else {
                    getUserTokens(user, res);
                }
            }
        });
    }
}

/**
 * @author Shahjalal
 * @desc handle email login
 * @params email,password
 * @return {accessToken, refreshToken,user}
 */
async function handleEmailLogin(email, res, password) {
    const user = await User.findOne({ email: email });
    if (!user) {
        res.status(401).json({ message: "User not found" });
    } else {
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ message: "Password is wrong" });
        } else {
            getUserTokens(user, res);
        }
    }
}

function getUserTokens(user, res) {
    const accessToken = jwt.sign({ email: user.email, id: user._id },
        process.env.JWT_SECRET, { expiresIn: "30m" }
    );
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "20m",
    });

    const userObj = user.toJSON();
    userObj["accessToken"] = accessToken;
    userObj["refreshToken"] = refreshToken;

    res.status(200).json(userObj);
}