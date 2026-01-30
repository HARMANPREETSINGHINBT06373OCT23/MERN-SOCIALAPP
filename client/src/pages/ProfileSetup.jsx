import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProfileSetup() {
  const nav = useNavigate();
  const [bio, setBio] = useState("");

  const submit = () => {
    // later: send bio/avatar to backend
    nav("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white border rounded-2xl p-8 w-96 space-y-4">
        <h2 className="text-2xl font-bold text-center">
          Set up your profile
        </h2>

        <div className="w-24 h-24 mx-auto rounded-full bg-neutral-300" />

        <textarea
          className="input"
          placeholder="Write a bio..."
          onChange={e => setBio(e.target.value)}
        />

        <button className="btn" onClick={submit}>
          Continue
        </button>
      </div>
    </div>
  );
}
