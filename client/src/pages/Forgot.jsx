import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import toast from "react-hot-toast";

export default function Forgot() {
  const nav = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [schoolName, setSchoolName] = useState("");

  const submit = () => {
    if (!identifier || !schoolName) {
      toast.error("Please fill all fields");
      return;
    }

    localStorage.setItem(
      "securityReset",
      JSON.stringify({ identifier, schoolName })
    );

    nav("/reset-password");
  };

  return (
    <AuthLayout title="Recover your password">
      {/* Mobile back / close button */}
      <button
        onClick={() => nav("/login")}
        className="absolute top-4 right-4 md:hidden text-gray-500 text-2xl"
        aria-label="Go back to login"
      >
        ✕
      </button>

      <label>Email or Username</label>
      <input
        className="input"
        placeholder="Enter email or username"
        onChange={e => setIdentifier(e.target.value)}
      />

      <label className="mt-3">
        What is your school name?
      </label>
      <input
        className="input"
        placeholder="Security answer"
        onChange={e => setSchoolName(e.target.value)}
      />

      <button className="btn mt-4" onClick={submit}>
        Verify & Reset Password
      </button>
    </AuthLayout>
  );
}
