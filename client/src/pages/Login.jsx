import { useState } from "react";
import api from "../services/api";
import { useDispatch } from "react-redux";
import { setAuth, setGuest } from "../store/authSlice";
import { getRecaptchaToken } from "../utils/recaptcha";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

export default function Login() {
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setSubmitted(true);

    if (!email || !password) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken();

      // ✅ CORRECT ENDPOINT
      const res = await api.post("/auth/login", {
        email,
        password,
        recaptchaToken
      });

      // ✅ FIX: backend sends `token`, NOT `accessToken`
      dispatch(
        setAuth({
          user: res.data.user,
          token: res.data.token
        })
      );

      toast.success("Welcome back 👋");
      // redirect handled by App.jsx (isAuth)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Wrong email or password";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Login to your account">
      <label>
        Email{" "}
        {submitted && !email && (
          <span className="text-red-500">*</span>
        )}
      </label>
      <input
        className="input"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <label>
        Password{" "}
        {submitted && !password && (
          <span className="text-red-500">*</span>
        )}
      </label>
      <input
        type="password"
        className="input"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button
        className="btn mt-4"
        onClick={submit}
        disabled={loading}
      >
        {loading ? "Logging in..." : "Login"}
      </button>

      <button
        className="btn bg-neutral-700 mt-2"
        onClick={() => {
          dispatch(setGuest());
          toast.success("Guest mode enabled");
        }}
      >
        Login as Guest
      </button>

      <div className="flex justify-between text-sm mt-3">
        <div className="flex gap-1">
          <span className="text-black">New user?</span>
          <Link
            to="/register"
            className="text-blue-600 hover:underline"
          >
            Create account
          </Link>
        </div>

        <Link
          to="/forgot"
          className="text-blue-600 hover:underline"
        >
          Forgot password?
        </Link>
      </div>
    </AuthLayout>
  );
}
