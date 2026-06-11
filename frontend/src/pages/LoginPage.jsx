import { useState } from "react";
import logo from "../assets/logo_main.png";

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit() {
    if (!email.trim() || !password.trim()) {
      alert("请填写邮箱和密码");
      return;
    }

    onLogin({
      email,
      name: "Whale",
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#F5F9FF,#EEF6FF)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: `"SimSun", "宋体", serif`,
      }}
    >
      <div
        style={{
          width: "380px",
          background: "rgba(255,255,255,0.92)",
          border: "1px solid #E5EAF3",
          borderRadius: "18px",
          padding: "34px",
          boxShadow: "0 18px 44px rgba(15,42,74,0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img src={logo} alt="logo" style={{ width: "62px" }} />
          <h1 style={{ margin: "12px 0 4px", color: "#183B63" }}>鲸记</h1>
          <p style={{ margin: 0, color: "#64748B" }}>NoteWhale</p>
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          style={inputStyle}
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          type="password"
          style={{ ...inputStyle, marginTop: "14px" }}
        />

        <button
          onClick={submit}
          style={{
            width: "100%",
            height: "46px",
            marginTop: "22px",
            border: "none",
            borderRadius: "12px",
            background: "linear-gradient(135deg,#4C8DFF,#2563EB)",
            color: "white",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          {mode === "login" ? "登录" : "注册并登录"}
        </button>

        <p
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          style={{
            marginTop: "18px",
            textAlign: "center",
            color: "#2563EB",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          {mode === "login" ? "还没有账号？注册" : "已有账号？登录"}
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  height: "44px",
  border: "1px solid #D6E0EF",
  borderRadius: "12px",
  padding: "0 14px",
  boxSizing: "border-box",
  fontSize: "14px",
};

export default LoginPage;