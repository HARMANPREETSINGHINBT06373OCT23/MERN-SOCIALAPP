import fetch from "node-fetch";

export const verifyRecaptcha = async (req, res, next) => {
  const token = req.body.recaptchaToken;
  if (!token) return res.status(400).json({ message: "Captcha missing" });

  const response = await fetch(
    `https://www.google.com/recaptcha/api/siteverify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    }
  );

  const data = await response.json();
  if (!data.success || data.score < 0.5) {
    return res.status(403).json({ message: "Captcha verification failed" });
  }

  next();
};
