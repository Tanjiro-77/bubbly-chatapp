import { Request, Response } from "express"
import User from "../modals/User";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/token";

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    const { email, password, name, avatar } = req.body;
    try {
        // check if it already exists
        let user = await User.findOne({ email });
        if (user) {
            res.status(400).json({ success: false, msg: "User already exists" });
            return;
        }

        // create a new user
        user = new User({
            email,
            password,
            name,
            avatar: avatar || "",
        });

        // hash the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // save the user
        await user.save();

        // genreate token
        const token = generateToken(user);

        res.json({
            success: true,
            token
        })

    } catch (error) {
        console.log('error:', error);
        res.status(500).json({ success: false, msg: "Server error" });
    }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    try {
        // find user by email

        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json({ success: false, msg: "Invalid Credentials" });
            return;
        }

        // compare passwords

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ success: false, msg: "Invalid Credentials" });
            return;
        }

        // genreate token
        const token = generateToken(user);

        res.json({
            success: true,
            token
        })

    } catch (error) {
        console.log('error:', error);
        res.status(500).json({ success: false, msg: "Server error" });
    }
};
