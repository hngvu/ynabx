import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthScreen } from "../components/AuthScreen";

describe("AuthScreen Component", () => {
  it("renders login form by default with email and password fields", () => {
    const onLogin = vi.fn();
    const onRegister = vi.fn();

    const html = renderToStaticMarkup(
      <AuthScreen onLogin={onLogin} onRegister={onRegister} />,
    );

    expect(html).toContain("Log In");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain("Need an account?");
    expect(html).toContain("Sign Up");
  });

  it("renders session expired alert when sessionExpiredMessage prop is provided", () => {
    const onLogin = vi.fn();
    const onRegister = vi.fn();

    const html = renderToStaticMarkup(
      <AuthScreen
        onLogin={onLogin}
        onRegister={onRegister}
        sessionExpiredMessage="Your session has expired. Please log in again."
      />,
    );

    expect(html).toContain("Your session has expired. Please log in again.");
  });
});
