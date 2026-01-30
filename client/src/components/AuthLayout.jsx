export default function AuthLayout({ title, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md bg-white border rounded-2xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-center mb-6">
          SocialApp
        </h1>
        <h2 className="text-lg font-semibold text-center mb-4">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
