import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/logo_main.png";
import { getApiBaseUrl } from "../api/apiClient";
import { loginAccount, registerAccount } from "../api/authApi";

const API_BASE_URL = getApiBaseUrl();

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState("login");
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("学生");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiState, setApiState] = useState("checking");

  const from = searchParams.get("from") || "/";

  useEffect(() => {
    let mounted = true;

    async function checkApi() {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          cache: "no-store",
        });

        if (!mounted) return;

        if (response.ok) {
          setApiState("online");
        } else {
          setApiState("local");
        }
      } catch {
        if (mounted) {
          setApiState("local");
        }
      }
    }

    checkApi();

    return () => {
      mounted = false;
    };
  }, []);

  const apiBadge = useMemo(() => {
    if (apiState === "checking") {
      return {
        text: "正在检测后端",
        dot: "#F59E0B",
        bg: "#FFF7ED",
        color: "#B45309",
      };
    }

    if (apiState === "online") {
      return {
        text: "后端连接正常",
        dot: "#10B981",
        bg: "#ECFDF5",
        color: "#047857",
      };
    }

    return {
      text: "本地体验模式",
      dot: "#3B82F6",
      bg: "#EFF6FF",
      color: "#1D4ED8",
    };
  }, [apiState]);

  async function submit() {
    const cleanAccount = account.trim();
    const cleanName = name.trim() || cleanAccount.split("@")[0] || studentId.trim();

    if (apiState !== "online") {
      setError("要实现多设备同步，需要先启动后端服务。请确认 http://127.0.0.1:8000/health 可访问。");
      return;
    }

    if (!cleanAccount) {
      setError("请填写邮箱 / 学号");
      return;
    }

    if (!password.trim()) {
      setError("请填写密码");
      return;
    }

    if (mode === "register" && !cleanName) {
      setError("注册时请填写昵称或姓名");
      return;
    }

    if (mode === "register" && password.trim().length < 6) {
      setError("密码至少需要 6 位");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session =
        mode === "register"
          ? await registerAccount({
              account: cleanAccount,
              password: password.trim(),
              name: cleanName,
              role: "学生",
              studentId: "",
            })
          : await loginAccount({
              account: cleanAccount,
              password: password.trim(),
            });

      onLogin?.(session);
      navigate(from, { replace: true });
    } catch (error) {
      setError(error.message || (mode === "register" ? "注册失败" : "登录失败"));
    } finally {
      setLoading(false);
    }
  }

  async function useDemoAccount() {
    if (apiState !== "online") {
      setError("演示账号也需要后端在线。请先启动 FastAPI 后端。");
      return;
    }

    const demo = {
      account: "demo@notewhale.local",
      password: "notewhale-demo",
      name: "体验用户",
      role: "体验用户",
      studentId: "",
    };

    setLoading(true);
    setError("");

    try {
      let session;

      try {
        session = await loginAccount({
          account: demo.account,
          password: demo.password,
        });
      } catch {
        session = await registerAccount(demo);
      }

      onLogin?.(session);
      navigate(from, { replace: true });
    } catch (error) {
      setError(error.message || "演示账号进入失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={decorCircleOne} />
      <div style={decorCircleTwo} />

      <main style={layoutStyle}>
        <section style={brandPanelStyle}>
          <div style={brandTopStyle}>
            <img src={logo} alt="NoteWhale logo" style={logoStyle} />
            <div>
              <div style={brandNameStyle}>鲸记 NoteWhale</div>
              <div style={brandSubStyle}>课程资料 · AI 笔记 · DDL 管理</div>
            </div>
          </div>

          <h1 style={heroTitleStyle}>
            让课程资料变成
            <br />
            可复习的知识空间
          </h1>

          <p style={heroTextStyle}>
            当前版本已接入真实账号登录、用户数据隔离与数据库同步。
            换一台设备登录同一账号，也可以读取该账号的课程、DDL、笔记与资料记录。
          </p>

          <div style={featureGridStyle}>
            <FeatureCard title="资料沉淀" text="统一保存课件、讲义与参考材料" />
            <FeatureCard title="笔记编辑" text="支持文档、Markdown 与符号输入" />
            <FeatureCard title="DDL 追踪" text="按课程聚合截止时间与任务状态" />
          </div>

          <div style={statusStripStyle}>
            <span style={{ ...statusDotStyle, background: apiBadge.dot }} />
            <span style={{ color: apiBadge.color, fontWeight: 700 }}>
              {apiBadge.text}
            </span>
            <span style={{ color: "#64748B" }}>
              {apiState === "online"
                ? "API 可用，后续可切换真实数据"
                : "后端未启动时仍可完成前端演示"}
            </span>
          </div>
        </section>

        <section style={loginCardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h2 style={cardTitleStyle}>
                {mode === "login" ? "登录学习空间" : "创建体验账号"}
              </h2>
              <p style={cardTextStyle}>
                {mode === "login"
                  ? "输入账号和密码，进入你的云端学习空间。"
                  : "创建账号后，课程、DDL、笔记会按账号保存。"}
              </p>
            </div>

            <span
              style={{
                ...apiBadgeStyle,
                background: apiBadge.bg,
                color: apiBadge.color,
              }}
            >
              <span style={{ ...smallDotStyle, background: apiBadge.dot }} />
              {apiState === "online" ? "API" : "Local"}
            </span>
          </div>

          <div style={switchStyle}>
            <button
              onClick={() => setMode("login")}
              style={switchButtonStyle(mode === "login")}
            >
              登录
            </button>
            <button
              onClick={() => setMode("register")}
              style={switchButtonStyle(mode === "register")}
            >
              注册
            </button>
          </div>

          <label style={labelStyle}>邮箱 / 学号</label>
          <input
            value={account}
            onChange={(event) => {
              setAccount(event.target.value);
              setError("");
            }}
            placeholder={mode === "login" ? "请输入邮箱 / 学号" : "例如：student@example.com / 2026xxxx"}
            style={inputStyle}
          />

          {mode === "register" && (
            <>
              <label style={labelStyle}>昵称 / 姓名</label>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                placeholder="例如：鲸记用户"
                style={inputStyle}
              />


            </>
          )}

          <label style={labelStyle}>密码</label>
          <input
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="请输入密码"
            type="password"
            style={inputStyle}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />

          {mode === "login" && (
            <div style={loginTipStyle}>
              <div style={loginTipTitleStyle}>账号数据云端同步</div>
              <div style={loginTipTextStyle}>
                登录后会自动读取该账号下的课程、DDL、笔记与资料记录。
              </div>
            </div>
          )}

          {error && <div style={errorStyle}>{error}</div>}

          <div style={actionAreaStyle}>
            <button onClick={submit} style={primaryButtonStyle} disabled={loading}>
            {loading ? "正在处理..." : mode === "login" ? "登录鲸记" : "注册并进入"}
          </button>

          <button onClick={useDemoAccount} style={demoButtonStyle} disabled={loading}>
            使用演示账号进入
          </button>

            <p style={hintStyle}>
              {mode === "login"
                ? "还没有账号？"
                : "已有账号？"}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                }}
                style={linkButtonStyle}
              >
                {mode === "login" ? "创建体验账号" : "返回登录"}
              </button>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ title, text }) {
  return (
    <div style={featureCardStyle}>
      <strong style={{ color: "#183B63", fontSize: "14px" }}>{title}</strong>
      <p style={{ margin: "8px 0 0", color: "#64748B", fontSize: "13px", lineHeight: 1.6 }}>
        {text}
      </p>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 10% 10%, rgba(147,197,253,0.32), transparent 34%), linear-gradient(180deg,#F6FAFF 0%,#EEF6FF 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  fontFamily:
    `"Inter", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif`,
  position: "relative",
  overflow: "hidden",
};

const decorCircleOne = {
  position: "absolute",
  width: "360px",
  height: "360px",
  borderRadius: "50%",
  background: "rgba(59,130,246,0.10)",
  top: "-120px",
  right: "-90px",
};

const decorCircleTwo = {
  position: "absolute",
  width: "280px",
  height: "280px",
  borderRadius: "50%",
  background: "rgba(167,139,250,0.11)",
  bottom: "-100px",
  left: "-80px",
};

const layoutStyle = {
  width: "min(1080px, 100%)",
  display: "grid",
  gridTemplateColumns: "1.08fr 0.92fr",
  gap: "24px",
  position: "relative",
  zIndex: 1,
  alignItems: "stretch",
};

const brandPanelStyle = {
  height: "640px",
  minHeight: "640px",
  borderRadius: "24px",
  padding: "36px",
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(226,232,240,0.86)",
  boxShadow: "0 24px 60px rgba(15,42,74,0.10)",
  backdropFilter: "blur(24px)",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
};

const brandTopStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const logoStyle = {
  width: "54px",
  height: "54px",
  objectFit: "contain",
  borderRadius: "16px",
};

const brandNameStyle = {
  color: "#183B63",
  fontSize: "18px",
  fontWeight: 800,
  letterSpacing: "-0.03em",
};

const brandSubStyle = {
  marginTop: "4px",
  color: "#64748B",
  fontSize: "13px",
};

const heroTitleStyle = {
  margin: "78px 0 18px",
  color: "#132F4F",
  fontSize: "44px",
  lineHeight: 1.16,
  letterSpacing: "-0.06em",
  fontWeight: 850,
};

const heroTextStyle = {
  margin: 0,
  color: "#64748B",
  fontSize: "15px",
  lineHeight: 1.9,
  maxWidth: "520px",
};

const featureGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "44px",
};

const featureCardStyle = {
  background: "rgba(248,250,252,0.82)",
  border: "1px solid #E2E8F0",
  borderRadius: "16px",
  padding: "16px",
};

const statusStripStyle = {
  marginTop: "auto",
  height: "48px",
  borderRadius: "14px",
  border: "1px solid #E2E8F0",
  background: "rgba(248,250,252,0.78)",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "0 16px",
  fontSize: "13px",
};

const statusDotStyle = {
  width: "9px",
  height: "9px",
  borderRadius: "50%",
  flexShrink: 0,
};

const loginCardStyle = {
  height: "640px",
  minHeight: "640px",
  background: "rgba(255,255,255,0.94)",
  border: "1px solid #E2E8F0",
  borderRadius: "22px",
  padding: "30px",
  boxShadow: "0 24px 60px rgba(15,42,74,0.12)",
  boxSizing: "border-box",
};

const cardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  marginBottom: "22px",
};

const cardTitleStyle = {
  margin: 0,
  color: "#183B63",
  fontSize: "26px",
  fontWeight: 850,
  letterSpacing: "-0.04em",
};

const cardTextStyle = {
  margin: "8px 0 0",
  color: "#64748B",
  fontSize: "13px",
  lineHeight: 1.7,
};

const apiBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: 800,
  flexShrink: 0,
};

const smallDotStyle = {
  width: "7px",
  height: "7px",
  borderRadius: "50%",
};

const switchStyle = {
  height: "44px",
  background: "#F1F5F9",
  borderRadius: "14px",
  padding: "4px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "4px",
  marginBottom: "20px",
};

function switchButtonStyle(active) {
  return {
    border: "none",
    borderRadius: "11px",
    background: active ? "#FFFFFF" : "transparent",
    color: active ? "#1D4ED8" : "#64748B",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 800,
    boxShadow: active ? "0 8px 18px rgba(15,42,74,0.08)" : "none",
  };
}

const labelStyle = {
  display: "block",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 800,
  margin: "14px 0 8px",
};

const inputStyle = {
  width: "100%",
  height: "46px",
  border: "1px solid #D6E0EF",
  borderRadius: "12px",
  padding: "0 14px",
  boxSizing: "border-box",
  fontSize: "14px",
  outline: "none",
  color: "#183B63",
  background: "#FFFFFF",
  fontFamily: "inherit",
};

const errorStyle = {
  marginTop: "14px",
  background: "#FEF2F2",
  color: "#DC2626",
  border: "1px solid #FECACA",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "13px",
  lineHeight: 1.6,
};

const loginTipStyle = {
  marginTop: "18px",
  border: "1px solid #E2E8F0",
  borderRadius: "14px",
  background: "#F8FAFC",
  padding: "14px 16px",
};

const loginTipTitleStyle = {
  color: "#183B63",
  fontSize: "13px",
  fontWeight: 850,
};

const loginTipTextStyle = {
  marginTop: "6px",
  color: "#64748B",
  fontSize: "13px",
  lineHeight: 1.7,
};

const actionAreaStyle = {
  marginTop: "auto",
};

const primaryButtonStyle = {
  width: "100%",
  height: "48px",
  marginTop: "20px",
  border: "none",
  borderRadius: "12px",
  background: "linear-gradient(135deg,#4C8DFF,#2563EB)",
  color: "#FFFFFF",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 850,
  boxShadow: "0 14px 28px rgba(37,99,235,0.22)",
  fontFamily: "inherit",
};

const demoButtonStyle = {
  width: "100%",
  height: "44px",
  marginTop: "12px",
  border: "1px solid #D6E0EF",
  borderRadius: "12px",
  background: "#F8FAFC",
  color: "#1D4ED8",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 800,
  fontFamily: "inherit",
};

const hintStyle = {
  margin: "18px 0 0",
  textAlign: "center",
  color: "#64748B",
  fontSize: "13px",
};

const linkButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#2563EB",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 800,
  marginLeft: "4px",
  padding: 0,
};

export default LoginPage;
