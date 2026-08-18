import { useEffect as reactUseEffect, useState } from "react";
import "./App.css";
import axios from "axios";
import {
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "";
const API = `${BACKEND}/api`;
const api = axios.create({ baseURL: API, withCredentials: true });
const useEffect = (effect, deps) => reactUseEffect(() => { effect(); }, deps);
const statuses = [
  { key: "not_dialed", label: "Not dialed" },
  { key: "dialed", label: "Dialed" },
  { key: "hot", label: "Hot" },
  { key: "cold", label: "Cold" },
  { key: "did_not_pick", label: "Did not pick" },
  { key: "invalid", label: "Invalid" },
];
const errorText = (e) =>
  typeof e?.response?.data?.detail === "string" ? e.response.data.detail : "Something went wrong. Try again.";
const StatusPill = ({ status }) => (
  <span className={`status-pill status-${status}`} data-testid={`lead-status-${status}`}>
    {statuses.find((x) => x.key === status)?.label || status}
  </span>
);
const Empty = ({ text }) => (
  <div className="empty">
    <span>—</span>
    <p>{text}</p>
  </div>
);
const Metric = ({ label, value, note, accent }) => (
  <div className={`metric ${accent || ""}`}>
    <div className="metric-label">{label}</div>
    <strong data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}>{value}</strong>
    <small>{note}</small>
  </div>
);

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  return (
    <main className="login-page">
      <div className="login-mark">
        <span>RD</span>
        <div>
          <b>REX-DOOM</b>
          <small>TRACKER / 01</small>
        </div>
      </div>
      <section className="login-panel">
        <div className="eyebrow">SECURE OPERATIONS</div>
        <h1>
          Keep every
          <br />
          <em>conversation</em> moving.
        </h1>
        <p className="muted">
          Sign in to your lead relay. Caller workspaces reveal contact details only at the moment of action.
        </p>
        <form
          data-testid="login-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const { data } = await api.post("/auth/login", form);
              onLogin(data);
            } catch (err) {
              setError(errorText(err));
            }
          }}
        >
          <label>
            Username
            <input
              data-testid="login-username-input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              data-testid="login-password-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          {error && (
            <div className="error" data-testid="login-error">
              {error}
            </div>
          )}
          <button className="primary-button full" data-testid="login-submit-button">
            Enter tracker <ChevronRight size={18} />
          </button>
        </form>
        <div className="login-foot">
          <ShieldCheck size={15} /> Phone details stay protected until a caller chooses Call
        </div>
      </section>
    </main>
  );
}

function Shell({ user, onLogout, children, tab, setTab }) {
  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="brand">
          <span>RD</span>
          <div>
            <b>REX-DOOM</b>
            <small>TRACKER / 01</small>
          </div>
        </div>
        <nav>
          <button
            data-testid="nav-overview-button"
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            <LayoutDashboard size={17} /> Overview
          </button>
          {user.role === "admin" && (
            <>
              <button
                data-testid="nav-leads-button"
                className={tab === "leads" ? "active" : ""}
                onClick={() => setTab("leads")}
              >
                <FileSpreadsheet size={17} /> Lead bank
              </button>
              <button
                data-testid="nav-callers-button"
                className={tab === "callers" ? "active" : ""}
                onClick={() => setTab("callers")}
              >
                <Users size={17} /> Callers
              </button>
            </>
          )}
          <button
            data-testid="nav-workspace-button"
            className={tab === "workspace" ? "active" : ""}
            onClick={() => setTab("workspace")}
          >
            <Phone size={17} /> My relay
          </button>
        </nav>
        <div className="rail-bottom">
          <div className="secure-line">
            <span className="signal-dot" /> System secure
          </div>
          <button data-testid="logout-button" className="logout" onClick={onLogout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">{user.role === "admin" ? "COMMAND BOARD" : "CALLER RELAY"}</div>
            <h2>
              {tab === "overview"
                ? "Overview"
                : tab === "leads"
                  ? "Lead bank"
                  : tab === "callers"
                    ? "Caller roster"
                    : "My relay"}
            </h2>
          </div>
          <div className="profile">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span>
              <b data-testid="current-user-name">{user.name}</b>
              <small>{user.role}</small>
            </span>
            <Bell size={17} />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function Overview({ data, user, setTab }) {
  const total = data?.total || 0;
  const dialed = data?.dialed || 0;
  return (
    <div className="page-body">
      <section className="hero-strip">
        <div>
          <div className="eyebrow">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </div>
          <h1>{user.role === "admin" ? "The room is live." : "Your next signal is ready."}</h1>
          <p className="muted">
            {user.role === "admin"
              ? "Watch the pipeline, spot the bottlenecks, keep the handoffs clean."
              : "Pick up where you left off. Every update saves automatically."}
          </p>
        </div>
        <button className="primary-button" data-testid="overview-open-workspace-button" onClick={() => setTab("workspace")}>
          Open relay <Phone size={16} />
        </button>
      </section>
      <div className="metrics-grid">
        <Metric label="Total leads" value={total} note="in the system" accent="accent-red" />
        <Metric
          label="Calls completed"
          value={dialed}
          note={`${total ? Math.round((dialed / total) * 100) : 0}% of total`}
        />
        <Metric label="Hot leads" value={data?.statuses?.hot || 0} note="ready for follow-up" accent="accent-amber" />
        <Metric label="Unworked" value={data?.statuses?.not_dialed || 0} note="waiting for first touch" />
      </div>
      {user.role === "admin" ? (
        <section className="dashboard-grid">
          <div className="panel performance-panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">LIVE DISTRIBUTION</div>
                <h3>Caller performance</h3>
              </div>
              <button className="icon-button" data-testid="overview-refresh-button" onClick={() => window.location.reload()}>
                <RefreshCw size={16} />
              </button>
            </div>
            {data?.performance?.length ? (
              data.performance.map((c) => (
                <div className="performance-row" key={c.id}>
                  <div className="caller-avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                  <div className="row-main">
                    <b>{c.name}</b>
                    <small>{c.username} · {c.total} assigned</small>
                  </div>
                  <div className="bar-wrap">
                    <div className="bar">
                      <span style={{ width: `${c.total ? (c.dialed / c.total) * 100 : 0}%` }} />
                    </div>
                    <small>{c.dialed}/{c.total} dialed</small>
                  </div>
                  <span className="hot-count">{c.hot} hot</span>
                </div>
              ))
            ) : (
              <Empty text="Create callers to see performance here." />
            )}
          </div>
          <div className="panel status-panel">
            <div className="eyebrow">PIPELINE PULSE</div>
            <h3>Lead status</h3>
            {statuses.slice(1).map((s) => (
              <div className="status-line" key={s.key}>
                <span>
                  <i className={`status-dot status-${s.key}`} />
                  {s.label}
                </span>
                <b>{data?.statuses?.[s.key] || 0}</b>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <CallerSnapshot data={data} />
      )}
    </div>
  );
}

function CallerSnapshot({ data }) {
  return (
    <section className="panel relay-snapshot">
      <div className="panel-head">
        <div>
          <div className="eyebrow">YOUR PROGRESS</div>
          <h3>Relay snapshot</h3>
        </div>
        <span className="saved">
          <Check size={14} /> Saved live
        </span>
      </div>
      <div className="snapshot-grid">
        {statuses.map((s) => (
          <div key={s.key}>
            <StatusPill status={s.key} />
            <strong>{data?.statuses?.[s.key] || 0}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function Leads({ refresh }) {
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const load = () => api.get("/leads").then((r) => setLeads(r.data));
  useEffect(load, [refresh]);
  const filtered = leads.filter(
    (l) => l.client_name.toLowerCase().includes(query.toLowerCase()) || l.phone?.includes(query)
  );
  return (
    <div className="page-body">
      <div className="toolbar">
        <label className="search">
          <Search size={16} />
          <input
            data-testid="lead-search-input"
            placeholder="Search client or number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="upload-button">
          <Upload size={16} /> Import leads
          <input
            data-testid="lead-import-input"
            type="file"
            accept=".xlsx,.xls,.pdf"
            onChange={async (e) => {
              const selected = e.target.files[0];
              if (!selected) return;
              const form = new FormData();
              form.append("file", selected);
              try {
                const { data } = await api.post("/imports", form);
                setMessage(`${data.inserted} leads imported · ${data.skipped} duplicates skipped`);
                load();
              } catch (err) {
                setMessage(errorText(err));
              }
            }}
          />
        </label>
        <button
          className="secondary-button"
          data-testid="assign-all-leads-button"
          onClick={async () => {
            const { data } = await api.post("/callers/assign-all");
            setMessage(`${data.assigned} leads assigned across callers`);
          }}
        >
          Distribute queue
        </button>
        <button
          className="secondary-button"
          data-testid="export-leads-button"
          onClick={async () => {
            const r = await api.get("/exports/leads", { responseType: "blob" });
            const url = URL.createObjectURL(r.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = "rex-doom-leads.xlsx";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={16} /> Export XLSX
        </button>
      </div>
      {message && (
        <div className="notice" data-testid="lead-import-message">
          <Check size={16} />
          {message}
        </div>
      )}
      <div className="panel table-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">LEAD BANK / {leads.length}</div>
            <h3>Every signal in one place</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table data-testid="lead-bank-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Interest</th>
                <th>Last action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td>
                    <b>{l.client_name}</b>
                    <small>{l.id.slice(0, 8)}</small>
                  </td>
                  <td className="mono">{l.phone || "—"}</td>
                  <td>
                    <StatusPill status={l.status} />
                  </td>
                  <td>{l.interest_type !== "unmarked" ? l.interest_type : "—"}</td>
                  <td className="muted">{l.updated_at ? new Date(l.updated_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <Empty text="No leads match this search." />}
        </div>
      </div>
    </div>
  );
}

function Callers({ refresh }) {
  const [callers, setCallers] = useState([]);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [notice, setNotice] = useState("");
  const load = () => api.get("/callers").then((r) => setCallers(r.data));
  useEffect(load, [refresh]);
  return (
    <div className="page-body">
      <section className="panel create-caller">
        <div>
          <div className="eyebrow">NEW ACCESS</div>
          <h3>Generate a caller profile</h3>
          <p className="muted">Credentials are only shown once. Give them directly to the caller.</p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post("/callers", form);
              setForm({ name: "", username: "", password: "" });
              setNotice("Caller profile generated");
              load();
            } catch (err) {
              setNotice(errorText(err));
            }
          }}
        >
          <input
            data-testid="caller-name-input"
            placeholder="Caller name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            data-testid="caller-username-input"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            data-testid="caller-password-input"
            placeholder="Temporary password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button className="primary-button" data-testid="create-caller-button">
            <Plus size={16} /> Generate
          </button>
        </form>
        {notice && (
          <div className="notice" data-testid="caller-create-message">
            <Check size={16} />
            {notice}
          </div>
        )}
      </section>
      <div className="caller-roster">
        {callers.map((c) => (
          <div className="panel roster-row" key={c.id}>
            <div className="caller-avatar">{c.name.slice(0, 2).toUpperCase()}</div>
            <div className="row-main">
              <b>{c.name}</b>
              <small>{c.username}</small>
            </div>
            <span className="saved">
              <span className="signal-dot" /> Active
            </span>
            <button
              className="icon-button"
              data-testid={`edit-caller-${c.id}-button`}
              onClick={async () => {
                const name = window.prompt("Edit caller name", c.name);
                if (name) {
                  await api.patch(`/callers/${c.id}`, { name });
                  load();
                }
              }}
            >
              <RefreshCw size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Workspace({ user }) {
  const [leads, setLeads] = useState([]);
  const [index, setIndex] = useState(0);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const load = () =>
    api.get("/leads").then((r) => {
      setLeads(r.data);
      const saved = localStorage.getItem(`rex-last-${user.id}`);
      if (saved) setIndex(Math.min(Number(saved), Math.max(r.data.length - 1, 0)));
    });
  useEffect(load, [user.id]);
  const lead = leads[index];
  const save = async (changes) => {
    if (!lead) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/leads/${lead.id}`, changes);
      setLeads((xs) => xs.map((x) => (x.id === data.id ? data : x)));
      setMessage("Saved just now");
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (lead) localStorage.setItem(`rex-last-${user.id}`, index);
  }, [index, user.id, lead]);
  if (!lead)
    return (
      <div className="page-body">
        <Empty text="No leads are assigned to your relay yet." />
      </div>
    );
  const reveal = async () => {
    const { data } = await api.post(`/leads/${lead.id}/reveal`);
    setPhone(data.phone);
    await save({ status: lead.status === "not_dialed" ? "dialed" : lead.status });
  };
  return (
    <div className="page-body workspace-page">
      <div className="workspace-head">
        <div>
          <div className="eyebrow">
            LEAD {String(index + 1).padStart(2, "0")} / {String(leads.length).padStart(2, "0")}
          </div>
          <h1>
            Make the next
            <br />
            <em>right call.</em>
          </h1>
        </div>
        <div className="autosave" data-testid="autosave-status">
          {saving ? (
            <>
              <RefreshCw size={14} className="spin" /> Saving…
            </>
          ) : (
            <>
              <Check size={14} /> {message || "Saved just now"}
            </>
          )}
        </div>
      </div>
      <section className="lead-focus">
        <div className="lead-detail">
          <div className="eyebrow">CLIENT SIGNAL</div>
          <h2 data-testid="caller-client-name">{lead.client_name}</h2>
          <p className="lead-id">ID / {lead.id.slice(0, 8).toUpperCase()}</p>
          <div className="phone-reveal">
            {phone ? (
              <strong data-testid="revealed-phone-number">{phone}</strong>
            ) : (
              <>
                <span className="masked">••••••••••</span>
                <small>Number protected until action</small>
              </>
            )}
          </div>
          <div className="action-pair">
            <button className="primary-button" data-testid="caller-call-lead-button" onClick={reveal}>
              <Phone size={18} /> {phone ? "Call again" : "Reveal & call"}
            </button>
            {phone && (
              <a
                className="whatsapp-button"
                data-testid="caller-whatsapp-lead-button"
                href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} /> WhatsApp
              </a>
            )}
          </div>
        </div>
        <div className="qualification">
          <div className="eyebrow">QUALIFICATION RAIL</div>
          <h3>What happened?</h3>
          <div className="status-buttons">
            {statuses.slice(1).map((s) => (
              <button
                key={s.key}
                data-testid={`lead-status-${s.key}-button`}
                className={lead.status === s.key ? `selected status-${s.key}` : ""}
                onClick={() => save({ status: s.key })}
              >
                <i className={`status-dot status-${s.key}`} />
                {s.label}
              </button>
            ))}
          </div>
          <div className="interest-row">
            <button
              data-testid="lead-interest-interested-button"
              className={lead.interest === "interested" ? "selected" : ""}
              onClick={() => save({ interest: "interested" })}
            >
              Interested
            </button>
            <button
              data-testid="lead-interest-not-interested-button"
              className={lead.interest === "not_interested" ? "selected" : ""}
              onClick={() => save({ interest: "not_interested" })}
            >
              Not interested
            </button>
          </div>
          <div className="interest-row">
            <button
              data-testid="lead-type-investor-button"
              className={lead.interest_type === "investor" ? "selected" : ""}
              onClick={() => save({ interest_type: "investor" })}
            >
              Investor
            </button>
            <button
              data-testid="lead-type-end-user-button"
              className={lead.interest_type === "end_user" ? "selected" : ""}
              onClick={() => save({ interest_type: "end_user" })}
            >
              End-user
            </button>
          </div>
          <label className="notes-label">
            CALL NOTES
            <textarea
              data-testid="lead-comment-textarea"
              value={lead.comment || ""}
              placeholder="Capture the useful detail…"
              onChange={(e) =>
                setLeads((xs) => xs.map((x) => (x.id === lead.id ? { ...x, comment: e.target.value } : x)))
              }
              onBlur={(e) => save({ comment: e.target.value })}
            />
          </label>
        </div>
      </section>
      <div className="workspace-nav">
        <button
          className="secondary-button"
          data-testid="previous-lead-button"
          disabled={index === 0}
          onClick={() => {
            setPhone("");
            setIndex(index - 1);
          }}
        >
          Previous
        </button>
        <span>{index + 1} of {leads.length}</span>
        <button
          className="secondary-button"
          data-testid="next-lead-button"
          disabled={index === leads.length - 1}
          onClick={() => {
            setPhone("");
            setIndex(index + 1);
          }}
        >
          Next lead <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const load = () => api.get("/dashboard").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    if (user) load();
  }, [user, tab]);
  if (checking)
    return (
      <div className="loading-screen">
        <span className="signal-dot" /> Loading secure relay…
      </div>
    );
  if (!user) return <Login onLogin={setUser} />;
  return (
    <Shell
      user={user}
      tab={tab}
      setTab={setTab}
      onLogout={async () => {
        await api.post("/auth/logout");
        setUser(null);
      }}
    >
      <>
        {tab === "overview" && <Overview data={data} user={user} setTab={setTab} />}
        {tab === "leads" && user.role === "admin" && <Leads />}
        {tab === "callers" && user.role === "admin" && <Callers />}
        {tab === "workspace" && <Workspace user={user} />}
      </>
    </Shell>
  );
}

export default App;
