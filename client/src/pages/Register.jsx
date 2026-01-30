import { useState, useEffect } from "react";
import api from "../services/api";
import { getRecaptchaToken } from "../utils/recaptcha";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

export default function Register() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    securityAnswer: ""
  });

  // Username state
  const [usernameStatus, setUsernameStatus] = useState("idle"); // idle | checking | valid | invalid
  const [usernameMessage, setUsernameMessage] = useState("");

  // Email state
  const [emailStatus, setEmailStatus] = useState("idle"); // idle | checking | valid | invalid
  const [emailMessage, setEmailMessage] = useState("");

  const [passwordStrength, setPasswordStrength] = useState("");
  const [confirmError, setConfirmError] = useState("");

  /* ================= HELPERS ================= */

  const validateEmailFormat = email =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateUsername = username =>
    /^[a-zA-Z0-9._]{3,20}$/.test(username);

  const getPasswordStrength = password => {
    if (password.length < 6) return "Weak";
    if (
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[@$!%*?&#]/.test(password)
    )
      return "Strong";
    return "Medium";
  };

  /* ================= LIVE USERNAME CHECK ================= */

  useEffect(() => {
    const username = form.username.trim();

    if (!username) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    if (!validateUsername(username)) {
      setUsernameStatus("invalid");
      setUsernameMessage(
        
        "Minimum 3 characters. Only letters, numbers, dots, and underscores." );
      return;
    }

    setUsernameStatus("checking");
    setUsernameMessage("Checking username…");

    const timer = setTimeout(async () => {
      try {
        await api.get(
          `/users/check-username/${encodeURIComponent(
            username.toLowerCase()
          )}`
        );
        setUsernameStatus("valid");
        setUsernameMessage("Username available");
      } catch (err) {
        if (err.response?.status === 409) {
          setUsernameStatus("invalid");
          setUsernameMessage("Username already taken");
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.username]);

  /* ================= LIVE EMAIL CHECK ================= */

  useEffect(() => {
    const email = form.email.trim();

    if (!email) {
      setEmailStatus("idle");
      setEmailMessage("");
      return;
    }

    if (!validateEmailFormat(email)) {
      setEmailStatus("invalid");
      setEmailMessage("Invalid email format");
      return;
    }

    setEmailStatus("checking");
    setEmailMessage("Checking email…");

    const timer = setTimeout(async () => {
      try {
        await api.get(
          `/users/check-email/${encodeURIComponent(
            email.toLowerCase()
          )}`
        );
        setEmailStatus("valid");
        setEmailMessage("Email available");
      } catch (err) {
        if (err.response?.status === 409) {
          setEmailStatus("invalid");
          setEmailMessage("Email already exists");
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.email]);

  /* ================= PASSWORD ================= */

  useEffect(() => {
    if (!form.password) {
      setPasswordStrength("");
      return;
    }
    setPasswordStrength(getPasswordStrength(form.password));
  }, [form.password]);

  useEffect(() => {
    if (!form.confirmPassword) {
      setConfirmError("");
      return;
    }

    setConfirmError(
      form.password === form.confirmPassword
        ? ""
        : "Passwords do not match"
    );
  }, [form.password, form.confirmPassword]);

  /* ================= SUBMIT ================= */

  const submit = async () => {
    if (Object.values(form).some(v => !v)) {
      toast.error("Please fill all required fields");
      return;
    }

    if (
      usernameStatus !== "valid" ||
      emailStatus !== "valid" ||
      confirmError
    ) {
      toast.error("Please fix the highlighted errors");
      return;
    }

    setLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken();

      await api.post("/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
        schoolName: form.securityAnswer,
        recaptchaToken
      });

      toast.success(
        "Account created successfully. Enjoy surfing 🚀"
      );
      nav("/profile-setup");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI FIELD ================= */

  const field = (name, label, type = "text") => (
    <div className="mb-3">
      <label>{label}</label>
      <input
        type={type}
        className="input"
        value={form[name]}
        onChange={e =>
          setForm({ ...form, [name]: e.target.value })
        }
      />
    </div>
  );

  return (
    <AuthLayout title="Create your account">
      {field("username", "Username")}
      {usernameMessage && (
        <p
          className={`text-sm ${
            usernameStatus === "valid"
              ? "text-green-500"
              : "text-red-500"
          }`}
        >
          {usernameMessage}
        </p>
      )}

      {field("email", "Email")}
      {emailMessage && (
        <p
          className={`text-sm ${
            emailStatus === "valid"
              ? "text-green-500"
              : "text-red-500"
          }`}
        >
          {emailMessage}
        </p>
      )}

      {field("password", "Password", "password")}
      {passwordStrength && (
        <p className="text-sm text-gray-500">
          Password strength: {passwordStrength}
        </p>
      )}

      {field(
        "confirmPassword",
        "Confirm Password",
        "password"
      )}
      {confirmError && (
        <p className="text-red-500 text-sm">
          {confirmError}
        </p>
      )}

      {field(
        "securityAnswer",
        "What is your school name? (Security Question)"
      )}

      <button
        className="btn mt-4"
        onClick={submit}
        disabled={loading}
      >
        {loading
          ? "Creating account..."
          : "Create Account"}
      </button>

      {/* 🔁 SWITCH TO LOGIN */}
      <p className="text-center text-sm mt-4">
        Already have an account?{" "}
        <span
          className="text-blue-500 cursor-pointer"
          onClick={() => nav("/login")}
        >
          Login
        </span>
      </p>
    </AuthLayout>
  );
}
