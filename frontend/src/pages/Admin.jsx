import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Users, CalendarDays, HeartHandshake, Plus, Pencil, Trash2, X, Loader2, LayoutDashboard,
} from "lucide-react";
import dayjs from "dayjs";
import { api, formatApiErrorDetail } from "../lib/api";
import { Reveal } from "../components/Reveal";
import { Avatar } from "./Members";

const TABS = [
  { id: "members", label: "Members", icon: Users },
  { id: "meetings", label: "Meetings & Schedule", icon: CalendarDays },
  { id: "projects", label: "Service Projects", icon: HeartHandshake },
];

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    {children}
  </label>
);

const Modal = ({ title, onClose, children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 30, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={(e) => e.stopPropagation()}
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-royal/25 bg-panel p-6 sm:p-8"
      data-testid="admin-modal"
    >
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-royal-light">{title}</h3>
        <button onClick={onClose} className="rounded-full border border-royal/30 p-2 text-royal hover:bg-royal hover:text-black" data-testid="admin-modal-close">
          <X size={16} />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

const EMPTY_MEMBER = {
  name: "", role: "", classification: "", business: "", bio: "", photo_url: "",
  joined_year: new Date().getFullYear(), paul_harris: false, past_president: false,
  board_member: false, phone: "", email: "", address: "", birthday: "", anniversary: "", spouse: "",
};

const DeleteButton = ({ onConfirm, testId }) => {
  const [armed, setArmed] = useState(false);
  return (
    <button
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
        armed ? "border-red-500 bg-red-500/20 text-red-300" : "border-royal/25 text-slate-400 hover:border-red-500/50 hover:text-red-300"
      }`}
      data-testid={testId}
    >
      {armed ? "Confirm?" : <><Trash2 size={13} /> Delete</>}
    </button>
  );
};

export default function Admin() {
  const [tab, setTab] = useState("members");
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [memberForm, setMemberForm] = useState(null);
  const [meetingForm, setMeetingForm] = useState(null);
  const [projectForm, setProjectForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    const [s, m, mt, p] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/members"),
      api.get("/meetings"),
      api.get("/projects"),
    ]);
    setStats(s.data);
    setMembers(m.data);
    setMeetings(mt.data);
    setProjects(p.data);
  };

  useEffect(() => {
    loadAll().catch((e) => toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to load data"));
  }, []);

  const mutate = (fn, okMsg) =>
    fn()
      .then(() => {
        toast.success(okMsg);
        return loadAll();
      })
      .catch((e) => toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Action failed"));

  const saveMember = (e) => {
    e.preventDefault();
    const f = memberForm;
    const payload = {
      ...f,
      joined_year: parseInt(f.joined_year, 10) || new Date().getFullYear(),
    };
    setSaving(true);
    mutate(
      () => (f.id ? api.put(`/members/${f.id}`, payload) : api.post("/members", payload)),
      f.id ? "Member updated" : "Member added"
    ).finally(() => {
      setSaving(false);
      setMemberForm(null);
    });
  };

  const saveMeeting = (e) => {
    e.preventDefault();
    setSaving(true);
    mutate(
      () => (meetingForm.id ? api.put(`/meetings/${meetingForm.id}`, meetingForm) : api.post("/meetings", meetingForm)),
      meetingForm.id ? "Meeting updated" : "Meeting added"
    ).finally(() => {
      setSaving(false);
      setMeetingForm(null);
    });
  };

  const saveProject = (e) => {
    e.preventDefault();
    const f = {
      ...projectForm,
      volunteers: parseInt(projectForm.volunteers, 10) || 0,
      hours: parseInt(projectForm.hours, 10) || 0,
      lives_impacted: parseInt(projectForm.lives_impacted, 10) || 0,
    };
    setSaving(true);
    mutate(
      () => (f.id ? api.put(`/projects/${f.id}`, f) : api.post("/projects", f)),
      f.id ? "Project updated" : "Project added"
    ).finally(() => {
      setSaving(false);
      setProjectForm(null);
    });
  };

  return (
    <main className="min-h-screen bg-obsidian pb-24 pt-28 sm:pt-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal mount>
          <p className="eyebrow mb-3">Admin Portal</p>
          <h1 className="flex items-center gap-3 font-display text-3xl font-bold sm:text-4xl">
            <LayoutDashboard className="text-royal" /> Club Command Center
          </h1>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Members", stats?.members, "admin-stat-members"],
            ["Meetings", stats?.meetings, "admin-stat-meetings"],
            ["Projects", stats?.projects, "admin-stat-projects"],
            ["Portal Users", stats?.users, "admin-stat-users"],
          ].map(([label, val, id]) => (
            <div key={label} className="glass-card p-5" data-testid={id}>
              <p className="royal-text font-display text-3xl font-bold">{val ?? "—"}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-2 border-b border-royal/15 pb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`admin-tab-${t.id}`}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                tab === t.id
                  ? "bg-royal text-white shadow-[0_0_20px_rgba(65,105,225,0.35)]"
                  : "border border-royal/25 text-slate-300 hover:border-royal/60 hover:text-royal-light"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* MEMBERS TAB */}
        {tab === "members" && (
          <section className="mt-8">
            <div className="mb-6 flex justify-end">
              <button onClick={() => setMemberForm({ ...EMPTY_MEMBER })} className="btn-royal !px-4 !py-2.5 !text-xs" data-testid="admin-add-member-button">
                <Plus size={15} /> Add New Member
              </button>
            </div>
            <div className="glass-card overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm" data-testid="admin-members-table">
                <thead>
                  <tr className="border-b border-royal/15 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-4">Member</th>
                    <th className="px-5 py-4">Classification</th>
                    <th className="px-5 py-4">Phone (private)</th>
                    <th className="px-5 py-4">Flags</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-royal/[0.08] transition-colors hover:bg-black/30" data-testid={`admin-member-row-${m.id}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar member={m} size="h-10 w-10" />
                          <div>
                            <p className="font-semibold text-slate-100">{m.name}</p>
                            <p className="text-xs text-royal/70">{m.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-300">{m.classification}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-300">{m.phone || "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {m.board_member && <span className="rounded border border-royal/30 px-2 py-0.5 text-[10px] text-royal">Board</span>}
                          {m.past_president && <span className="rounded border border-royal/30 px-2 py-0.5 text-[10px] text-royal">Past Pres.</span>}
                          {m.paul_harris && <span className="rounded border border-royal/30 px-2 py-0.5 text-[10px] text-royal">PHF</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setMemberForm({ ...m })} className="inline-flex items-center gap-1 rounded-lg border border-royal/25 px-3 py-1.5 text-xs font-semibold text-royal-light transition-all hover:border-royal hover:bg-royal/10" data-testid={`admin-edit-member-${m.id}`}>
                            <Pencil size={13} /> Edit
                          </button>
                          <DeleteButton
                            testId={`admin-delete-member-${m.id}`}
                            onConfirm={() => mutate(() => api.delete(`/members/${m.id}`), "Member removed")}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* MEETINGS TAB */}
        {tab === "meetings" && (
          <section className="mt-8">
            <div className="mb-6 flex justify-end">
              <button onClick={() => setMeetingForm({ title: "", date: dayjs().add(7, "day").format("YYYY-MM-DD"), time: "7:00 PM", venue: "", kind: "fellowship", speaker: "", topic: "", description: "" })} className="btn-royal !px-4 !py-2.5 !text-xs" data-testid="admin-add-meeting-button">
                <Plus size={15} /> Add Meeting / Event
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {meetings.map((m) => (
                <div key={m.id} className="glass-card flex items-start justify-between gap-4 p-5" data-testid={`admin-meeting-row-${m.id}`}>
                  <div>
                    <p className="font-mono text-xs text-royal">{dayjs(m.date).format("ddd, DD MMM YYYY")} · {m.time}</p>
                    <p className="mt-1.5 font-display text-base font-bold">{m.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{m.venue}</p>
                    {m.speaker && <p className="mt-2 text-xs text-royal-light">{m.speaker} — <span className="text-slate-400">{m.topic}</span></p>}
                    <span className="mt-3 inline-block rounded-full border border-royal/25 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-royal/80">{m.kind}</span>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button onClick={() => setMeetingForm({ ...m })} className="inline-flex items-center gap-1 rounded-lg border border-royal/25 px-3 py-1.5 text-xs font-semibold text-royal-light hover:border-royal hover:bg-royal/10" data-testid={`admin-edit-meeting-${m.id}`}>
                      <Pencil size={13} /> Edit
                    </button>
                    <DeleteButton testId={`admin-delete-meeting-${m.id}`} onConfirm={() => mutate(() => api.delete(`/meetings/${m.id}`), "Meeting removed")} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROJECTS TAB */}
        {tab === "projects" && (
          <section className="mt-8">
            <div className="mb-6 flex justify-end">
              <button onClick={() => setProjectForm({ title: "", description: "", category: "", image_url: "", status: "active", volunteers: 0, hours: 0, lives_impacted: 0, date: dayjs().format("YYYY-MM-DD") })} className="btn-royal !px-4 !py-2.5 !text-xs" data-testid="admin-add-project-button">
                <Plus size={15} /> Add Project
              </button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <div key={p.id} className="glass-card overflow-hidden" data-testid={`admin-project-row-${p.id}`}>
                  <div className="relative h-36">
                    <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
                    <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${p.status === "active" ? "bg-emerald-500/90 text-black" : "bg-royal/90 text-white"}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-royal/70">{p.category}</p>
                    <p className="mt-1.5 font-display text-base font-bold">{p.title}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-400">{p.description}</p>
                    <p className="mt-3 font-mono text-xs text-royal-light">
                      {p.volunteers} volunteers · {p.hours} hrs · {p.lives_impacted.toLocaleString("en-IN")} lives
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => setProjectForm({ ...p })} className="inline-flex items-center gap-1 rounded-lg border border-royal/25 px-3 py-1.5 text-xs font-semibold text-royal-light hover:border-royal hover:bg-royal/10" data-testid={`admin-edit-project-${p.id}`}>
                        <Pencil size={13} /> Edit
                      </button>
                      <DeleteButton testId={`admin-delete-project-${p.id}`} onConfirm={() => mutate(() => api.delete(`/projects/${p.id}`), "Project removed")} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {memberForm && (
          <Modal title={memberForm.id ? "Edit Member" : "Add New Member"} onClose={() => setMemberForm(null)}>
            <form onSubmit={saveMember} className="space-y-4" data-testid="member-form">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name">
                  <input required className="input-dark" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} data-testid="member-form-name" />
                </Field>
                <Field label="Role (e.g. Club President)">
                  <input className="input-dark" value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })} data-testid="member-form-role" />
                </Field>
                <Field label="Classification">
                  <input className="input-dark" value={memberForm.classification} onChange={(e) => setMemberForm({ ...memberForm, classification: e.target.value })} data-testid="member-form-classification" />
                </Field>
                <Field label="Business / Firm">
                  <input className="input-dark" value={memberForm.business} onChange={(e) => setMemberForm({ ...memberForm, business: e.target.value })} data-testid="member-form-business" />
                </Field>
                <Field label="Photo URL">
                  <input className="input-dark" value={memberForm.photo_url} onChange={(e) => setMemberForm({ ...memberForm, photo_url: e.target.value })} data-testid="member-form-photo" />
                </Field>
                <Field label="Joined Year">
                  <input type="number" className="input-dark" value={memberForm.joined_year} onChange={(e) => setMemberForm({ ...memberForm, joined_year: e.target.value })} data-testid="member-form-joined" />
                </Field>
              </div>
              <Field label="Bio">
                <textarea rows={3} className="input-dark" value={memberForm.bio} onChange={(e) => setMemberForm({ ...memberForm, bio: e.target.value })} data-testid="member-form-bio" />
              </Field>
              <div className="flex flex-wrap gap-5 rounded-lg border border-royal/15 bg-black/30 p-4">
                {[["board_member", "Board Member"], ["past_president", "Past President"], ["paul_harris", "Paul Harris Fellow"]].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={!!memberForm[k]} onChange={(e) => setMemberForm({ ...memberForm, [k]: e.target.checked })} className="h-4 w-4 accent-[#4169E1]" data-testid={`member-form-${k}`} />
                    {label}
                  </label>
                ))}
              </div>
              <p className="eyebrow pt-2">Members-only details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone"><input className="input-dark" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} data-testid="member-form-phone" /></Field>
                <Field label="Email"><input className="input-dark" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} data-testid="member-form-email" /></Field>
                <Field label="Residential Address"><input className="input-dark" value={memberForm.address} onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value })} data-testid="member-form-address" /></Field>
                <Field label="Birthday (e.g. 12 March)"><input className="input-dark" value={memberForm.birthday} onChange={(e) => setMemberForm({ ...memberForm, birthday: e.target.value })} data-testid="member-form-birthday" /></Field>
                <Field label="Anniversary"><input className="input-dark" value={memberForm.anniversary} onChange={(e) => setMemberForm({ ...memberForm, anniversary: e.target.value })} data-testid="member-form-anniversary" /></Field>
                <Field label="Spouse Name"><input className="input-dark" value={memberForm.spouse} onChange={(e) => setMemberForm({ ...memberForm, spouse: e.target.value })} data-testid="member-form-spouse" /></Field>
              </div>
              <button type="submit" disabled={saving} className="btn-royal w-full" data-testid="member-form-submit">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {memberForm.id ? "Save Changes" : "Add Member"}
              </button>
            </form>
          </Modal>
        )}

        {meetingForm && (
          <Modal title={meetingForm.id ? "Edit Meeting" : "Add Meeting / Event"} onClose={() => setMeetingForm(null)}>
            <form onSubmit={saveMeeting} className="space-y-4" data-testid="meeting-form">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title"><input required className="input-dark" value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} data-testid="meeting-form-title" /></Field>
                <Field label="Date"><input required type="date" className="input-dark" value={meetingForm.date} onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })} data-testid="meeting-form-date" /></Field>
                <Field label="Time"><input className="input-dark" value={meetingForm.time} onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })} data-testid="meeting-form-time" /></Field>
                <Field label="Venue"><input className="input-dark" value={meetingForm.venue} onChange={(e) => setMeetingForm({ ...meetingForm, venue: e.target.value })} data-testid="meeting-form-venue" /></Field>
                <Field label="Speaker"><input className="input-dark" value={meetingForm.speaker} onChange={(e) => setMeetingForm({ ...meetingForm, speaker: e.target.value })} data-testid="meeting-form-speaker" /></Field>
                <Field label="Topic"><input className="input-dark" value={meetingForm.topic} onChange={(e) => setMeetingForm({ ...meetingForm, topic: e.target.value })} data-testid="meeting-form-topic" /></Field>
                <Field label="Type">
                  <select className="input-dark" value={meetingForm.kind} onChange={(e) => setMeetingForm({ ...meetingForm, kind: e.target.value })} data-testid="meeting-form-kind">
                    {["fellowship", "board", "project", "event"].map((k) => <option key={k} value={k} className="bg-panel">{k}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description"><textarea rows={3} className="input-dark" value={meetingForm.description} onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })} data-testid="meeting-form-description" /></Field>
              <button type="submit" disabled={saving} className="btn-royal w-full" data-testid="meeting-form-submit">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {meetingForm.id ? "Save Changes" : "Add Meeting"}
              </button>
            </form>
          </Modal>
        )}

        {projectForm && (
          <Modal title={projectForm.id ? "Edit Project" : "Add Project"} onClose={() => setProjectForm(null)}>
            <form onSubmit={saveProject} className="space-y-4" data-testid="project-form">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title"><input required className="input-dark" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} data-testid="project-form-title" /></Field>
                <Field label="Category"><input className="input-dark" value={projectForm.category} onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })} data-testid="project-form-category" /></Field>
                <Field label="Status">
                  <select className="input-dark" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })} data-testid="project-form-status">
                    {["active", "completed"].map((k) => <option key={k} value={k} className="bg-panel">{k}</option>)}
                  </select>
                </Field>
                <Field label="Date"><input type="date" className="input-dark" value={projectForm.date} onChange={(e) => setProjectForm({ ...projectForm, date: e.target.value })} data-testid="project-form-date" /></Field>
                <Field label="Image URL"><input className="input-dark" value={projectForm.image_url} onChange={(e) => setProjectForm({ ...projectForm, image_url: e.target.value })} data-testid="project-form-image" /></Field>
                <Field label="Volunteers"><input type="number" className="input-dark" value={projectForm.volunteers} onChange={(e) => setProjectForm({ ...projectForm, volunteers: e.target.value })} data-testid="project-form-volunteers" /></Field>
                <Field label="Service Hours"><input type="number" className="input-dark" value={projectForm.hours} onChange={(e) => setProjectForm({ ...projectForm, hours: e.target.value })} data-testid="project-form-hours" /></Field>
                <Field label="Lives Impacted"><input type="number" className="input-dark" value={projectForm.lives_impacted} onChange={(e) => setProjectForm({ ...projectForm, lives_impacted: e.target.value })} data-testid="project-form-lives" /></Field>
              </div>
              <Field label="Description"><textarea rows={3} className="input-dark" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} data-testid="project-form-description" /></Field>
              <button type="submit" disabled={saving} className="btn-royal w-full" data-testid="project-form-submit">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {projectForm.id ? "Save Changes" : "Add Project"}
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </main>
  );
}
