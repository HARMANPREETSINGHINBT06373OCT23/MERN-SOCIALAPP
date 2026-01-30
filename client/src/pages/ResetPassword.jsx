import { useState, useEffect } from "react";
import api from "../services/api";
import AuthLayout from "../components/AuthLayout";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const nav = useNavigate();

  const data = JSON.parse(
    localStorage.getItem("securityReset")
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [passwordStrength, setPasswordStrength] = useState("");
  const [matchError, setMatchError] = useState("");

  // 🚫 If user comes here directly
  useEffect(() => {
    if (!data) {
      nav("/forgot");
    }
  }, [data, nav]);

  /* ================= HELPERS ================= */

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

  /* ================= LIVE PASSWORD CHECKS ================= */

  useEffect(() => {
    if (!password) {
      setPasswordStrength("");
      return;
    }
    setPasswordStrength(getPasswordStrength(password));
  }, [password]);

  useEffect(() => {
    if (!confirm) {
      setMatchError("");
      return;
    }

    setMatchError(
      password === confirm
        ? ""
        : "Passwords do not match"
    );
  }, [password, confirm]);

  /* ================= SUBMIT ================= */

  const submit = async () => {
    if (!password || !confirm) {
      toast.error("Please fill all fields");
      return;
    }

    if (matchError) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      await api.post("/auth/reset-password-security", {
        identifier: data.identifier,
        schoolName: data.schoolName,
        password
      });

      localStorage.removeItem("securityReset");
      toast.success("Password updated successfully 🎉");
      nav("/login");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Password reset failed"
      );
    }
  };

  return (
    <AuthLayout title="Set new password">
      {/* Mobile back / close button */}
      <button
        onClick={() => nav("/login")}
        className="absolute top-4 right-4 md:hidden text-gray-500 text-2xl"
        aria-label="Go back to login"
      >
        ✕
      </button>

      <label>New password</label>
      <input
        className="input"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      {passwordStrength && (
        <p
          className={`text-sm ${
            passwordStrength === "Strong"
              ? "text-green-500"
              : passwordStrength === "Medium"
              ? "text-yellow-500"
              : "text-red-500"
          }`}
        >
          Password strength: {passwordStrength}
        </p>
      )}

      <label className="mt-3">Confirm password</label>
      <input
        className="input"
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
      />

      {matchError && (
        <p className="text-red-500 text-sm">
          {matchError}
        </p>
      )}

      <button className="btn mt-4" onClick={submit}>
        Update Password
      </button>
    </AuthLayout>
  );
}
