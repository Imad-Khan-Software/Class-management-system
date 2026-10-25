"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type ClassInfo = {
  id: number;
  className: string;
  subjectName: string;
  semester: string;
  academicYear: string;
};

type Student = {
  id: number;
  classId: number;
  fullName: string;
  registrationNumber: string;
};

type AttendanceRecord = {
  studentId: number;
  date: string;
  status: "Present" | "Absent";
};

type AssessmentCategory = "Quiz" | "Assignment" | "Midterm Exam" | "Final Term Exam";

type AssessmentRecord = {
  id: number;
  classId: number;
  category: AssessmentCategory;
  assessmentName: string;
};

type MarkRecord = {
  id: number;
  studentId: number;
  classId: number;
  category: AssessmentCategory;
  assessmentName: string;
  score: number;
  total: number;
};

type ModalType = "class" | "student" | "attendance" | "marks" | "studentDetails" | null;
type View = "Dashboard" | "My Classes" | "Attendance" | "Marks" | "Reports";

const navigation: { label: View; icon: string }[] = [
  { label: "Dashboard", icon: "▦" },
  { label: "My Classes", icon: "▤" },
  { label: "Attendance", icon: "✓" },
  { label: "Marks", icon: "▥" },
  { label: "Reports", icon: "▧" },
];

function todayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [activeView, setActiveView] = useState<View>("Dashboard");
  const [modal, setModal] = useState<ModalType>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [className, setClassName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [fullName, setFullName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceDraft, setAttendanceDraft] = useState<
    Record<number, "Present" | "Absent">
  >({});
  const [markDraft, setMarkDraft] = useState<
    Record<number, { score: string; total: string }>
  >({});
  const [assessmentCategory, setAssessmentCategory] = useState<AssessmentCategory>("Quiz");
  const [assessmentName, setAssessmentName] = useState("");
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [marksSaving, setMarksSaving] = useState(false);
  const [dataMessage, setDataMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const classStudents = selectedClass
    ? students.filter((student) => student.classId === selectedClass.id)
    : [];

  const filteredClasses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return classes;
    return classes.filter((item) =>
      [item.className, item.subjectName, item.semester, item.academicYear]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [classes, search]);

  const totalStudents = students.length;
  const attendanceRate = attendance.length
    ? Math.round(
        (attendance.filter((record) => record.status === "Present").length /
          attendance.length) *
          100
      )
    : null;
  const studentsWithMarks = marks.length;
  const averageMarks = marks.length
    ? Math.round(
        marks.reduce((sum, record) => sum + (record.score / record.total) * 100, 0) /
          marks.length
      )
    : null;

  useEffect(() => {
    setAttendanceDate((current) => current || todayString());
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    const loadSavedData = async (userId: string) => {
      setDataLoading(true);
      setDataMessage("");
      const [classResult, studentResult, attendanceResult, marksResult, assessmentResult] = await Promise.all([
        supabase.from("classes").select("id,class_name,subject_name,semester,academic_year").eq("teacher_id", userId).order("id"),
        supabase.from("students").select("id,class_id,full_name,registration_number").eq("teacher_id", userId).order("id"),
        supabase.from("attendance").select("student_id,attendance_date,status").eq("teacher_id", userId),
        supabase.from("marks").select("id,student_id,class_id,assessment_id,score,total").eq("teacher_id", userId),
        supabase.from("assessments").select("id,class_id,category,assessment_name").eq("teacher_id", userId).order("id"),
      ]);
      if (!mounted) return;
      const failed = classResult.error || studentResult.error || attendanceResult.error || marksResult.error || assessmentResult.error;
      if (failed) {
        console.error("TeachTrack data loading failed:", failed);
        setDataMessage(`Could not load saved data from Supabase: ${failed.message}. Check that the SQL setup succeeded and your environment variables are correct.`);
        setDataLoading(false);
        return;
      }
      const loadedClasses: ClassInfo[] = (classResult.data ?? []).map((row) => ({
        id: Number(row.id), className: row.class_name, subjectName: row.subject_name,
        semester: row.semester ?? "", academicYear: row.academic_year ?? "",
      }));
      const loadedStudents: Student[] = (studentResult.data ?? []).map((row) => ({
        id: Number(row.id), classId: Number(row.class_id), fullName: row.full_name,
        registrationNumber: row.registration_number,
      }));
      const loadedAttendance: AttendanceRecord[] = (attendanceResult.data ?? []).map((row) => ({
        studentId: Number(row.student_id), date: row.attendance_date, status: row.status as "Present" | "Absent",
      }));
      const loadedAssessments: AssessmentRecord[] = (assessmentResult.data ?? []).map((row) => ({
        id: Number(row.id), classId: Number(row.class_id),
        category: row.category as AssessmentCategory, assessmentName: row.assessment_name,
      }));
      const loadedMarks: MarkRecord[] = (marksResult.data ?? []).flatMap((row) => {
        const assessment = loadedAssessments.find((item) => item.id === Number(row.assessment_id));
        if (!assessment) return [];
        return [{
          id: Number(row.id), studentId: Number(row.student_id), classId: Number(row.class_id),
          category: assessment.category, assessmentName: assessment.assessmentName,
          score: Number(row.score), total: Number(row.total),
        }];
      });
      setClasses(loadedClasses);
      setStudents(loadedStudents);
      setAttendance(loadedAttendance);
      setAssessments(loadedAssessments);
      setMarks(loadedMarks);
      setSelectedClass((current) => current ? loadedClasses.find((item) => item.id === current.id) ?? null : null);
      setDataLoading(false);
    };

    const applyUser = (user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!mounted) return;
      if (!user) {
        setIsAuthenticated(false);
        setTeacherId(null);
        setClasses([]);
        setStudents([]);
        setAttendance([]);
        setMarks([]);
        setAssessments([]);
        setSelectedClass(null);
        setTeacherName("");
        setTeacherEmail("");
        setInstitutionName("");
        setDataMessage("");
        return;
      }
      const metadata = user.user_metadata ?? {};
      setTeacherId(user.id);
      setTeacherName(String(metadata.full_name ?? metadata.name ?? user.email?.split("@")[0] ?? "Teacher"));
      setTeacherEmail(user.email ?? "");
      setInstitutionName(String(metadata.institution ?? ""));
      setIsAuthenticated(true);
      void loadSavedData(user.id);
    };

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setLoginError("Could not verify your session. Please sign in again.");
      applyUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoginError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the development server.");
      return;
    }
    setLoginSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setLoginSubmitting(false);
    if (signInError) {
      setLoginError("Sign-in failed. Check the email and password for your authorized teacher account.");
      return;
    }
    setLoginPassword("");
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    setIsAuthenticated(false);
    setLoginPassword("");
    setSelectedClass(null);
  }

  function getClassAssessments(classId: number) {
    const categoryOrder: AssessmentCategory[] = ["Quiz", "Assignment", "Midterm Exam", "Final Term Exam"];
    const unique = new Map<string, { category: AssessmentCategory; assessmentName: string }>();
    assessments.filter((record) => record.classId === classId).forEach((record) => {
      const key = `${record.category}::${record.assessmentName}`;
      unique.set(key, { category: record.category, assessmentName: record.assessmentName });
    });
    return [...unique.values()].sort((a, b) =>
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) ||
      a.assessmentName.localeCompare(b.assessmentName, undefined, { numeric: true, sensitivity: "base" })
    );
  }

  function downloadClassMarksSheet(classInfo: ClassInfo) {
    const rows: (string | number)[][] = [
      ["TeachTrack Student Marks Sheet"],
      ["Teacher", teacherName || "Teacher"],
      ["Teacher Email", teacherEmail],
      ["Institution", institutionName || "Not provided"],
      ["Class", classInfo.className],
      ["Subject", classInfo.subjectName],
      ["Semester / Term", classInfo.semester],
      ["Academic Year", classInfo.academicYear],
      ["Generated On", new Date().toLocaleDateString()],
      [],
      ["S.No.", "Registration No.", "Student Name", ...getClassAssessments(classInfo.id).map((item) => `${item.category}: ${item.assessmentName}`), "Quiz Total", "Assignment Total", "Attendance %", "Midterm", "Final Term"],
    ];
    const list = students.filter((student) => student.classId === classInfo.id);
    const classAssessments = getClassAssessments(classInfo.id);
    list.forEach((student, index) => {
      const quiz = getCategorySummary(student.id, "Quiz");
      const assignment = getCategorySummary(student.id, "Assignment");
      const midterm = getCategorySummary(student.id, "Midterm Exam");
      const finalTerm = getCategorySummary(student.id, "Final Term Exam");
      rows.push([
        index + 1,
        student.registrationNumber,
        student.fullName,
        ...classAssessments.map((assessment) => {
          const record = marks.find((item) => item.classId === classInfo.id && item.studentId === student.id && item.category === assessment.category && item.assessmentName === assessment.assessmentName);
          return record ? `${record.score}/${record.total}` : "—";
        }),
        quiz ? `${quiz.score}/${quiz.total}` : "—",
        assignment ? `${assignment.score}/${assignment.total}` : "—",
        getAttendancePercentage(student.id) === null ? "—" : `${getAttendancePercentage(student.id)}%`,
        midterm ? `${midterm.score}/${midterm.total}` : "—",
        finalTerm ? `${finalTerm.score}/${finalTerm.total}` : "—",
      ]);
    });
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${classInfo.className.replace(/[^a-z0-9-_]+/gi, "-")}-marks-sheet.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCsv(filename: string, rows: (string | number)[][]) {
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function classFileRows(classInfo: ClassInfo) {
    const safeName = classInfo.className.replace(/[^a-z0-9-_]+/gi, "-");
    const list = students.filter((student) => student.classId === classInfo.id);
    const classAttendance = attendance.filter((record) => list.some((student) => student.id === record.studentId));
    const dates = [...new Set(classAttendance.map((record) => record.date))].sort();
    const quizzes = getClassAssessments(classInfo.id).filter((item) => item.category === "Quiz");
    const assignments = getClassAssessments(classInfo.id).filter((item) => item.category === "Assignment");
    const metadata: (string | number)[][] = [
      ["Teacher", teacherName || "Teacher"], ["Teacher Email", teacherEmail],
      ["Institution", institutionName || "Not provided"], ["Class", classInfo.className],
      ["Subject", classInfo.subjectName], ["Semester / Term", classInfo.semester],
      ["Academic Year", classInfo.academicYear], ["Generated On", new Date().toLocaleDateString()], [],
    ];
    return { safeName, list, dates, quizzes, assignments, metadata };
  }

  function downloadSummaryFile(classInfo: ClassInfo) {
    const { safeName, list, metadata } = classFileRows(classInfo);
    const rows: (string | number)[][] = [...metadata, ["Registration No.", "Student Name", "Total Assignment Marks", "Total Quiz Marks", "Mid Exam Marks", "Final Exam Marks"]];
    list.forEach((student) => {
      const assignment = getCategorySummary(student.id, "Assignment");
      const quiz = getCategorySummary(student.id, "Quiz");
      const mid = getCategorySummary(student.id, "Midterm Exam");
      const final = getCategorySummary(student.id, "Final Term Exam");
      rows.push([student.registrationNumber, student.fullName, assignment ? `${assignment.score}/${assignment.total}` : "—", quiz ? `${quiz.score}/${quiz.total}` : "—", mid ? `${mid.score}/${mid.total}` : "—", final ? `${final.score}/${final.total}` : "—"]);
    });
    downloadCsv(`${safeName}-marks-summary.csv`, rows);
  }

  function downloadAttendanceDetailFile(classInfo: ClassInfo) {
    const { safeName, list, dates, metadata } = classFileRows(classInfo);
    const rows: (string | number)[][] = [...metadata, ["Registration No.", "Student Name", ...dates.map((date, index) => `Class ${index + 1} (${date})`), "Total Present / Classes Taken"]];
    list.forEach((student) => {
      let present = 0;
      const sessionCells = dates.map((date, index) => {
        const record = attendance.find((item) => item.studentId === student.id && item.date === date);
        if (record?.status === "Present") present++;
        return record ? (record.status === "Present" ? "P" : "A") : "Not recorded";
      });
      rows.push([student.registrationNumber, student.fullName, ...sessionCells, `${present}/${dates.length}`]);
    });
    rows.push([], ["Legend", "P = Present", "A = Absent", "Not recorded = attendance not entered for that student/session"]);
    downloadCsv(`${safeName}-attendance-detail.csv`, rows);
  }

  function downloadAssessmentDetailFile(classInfo: ClassInfo, category: "Quiz" | "Assignment") {
    const { safeName, list, quizzes, assignments, metadata } = classFileRows(classInfo);
    const assessments = category === "Quiz" ? quizzes : assignments;
    const rows: (string | number)[][] = [...metadata, ["Registration No.", "Student Name", ...assessments.map((item, index) => `${category} ${index + 1}: ${item.assessmentName} (score/max)`), `Total ${category} Marks`]];
    list.forEach((student) => {
      const cells = assessments.map((assessment) => {
        const record = marks.find((item) => item.classId === classInfo.id && item.studentId === student.id && item.category === category && item.assessmentName === assessment.assessmentName);
        return record ? `${record.score}/${record.total}` : "—";
      });
      const summary = getCategorySummary(student.id, category);
      rows.push([student.registrationNumber, student.fullName, ...cells, summary ? `${summary.score}/${summary.total}` : "—"]);
    });
    downloadCsv(`${safeName}-${category.toLowerCase()}-detail.csv`, rows);
  }

  function downloadAllAttendanceFile() {
    const rows: (string | number)[][] = [["TeachTrack — All Classes Attendance Detail"], ["Teacher", teacherName || "Teacher"], ["Teacher Email", teacherEmail], ["Generated On", new Date().toLocaleDateString()], []];
    if (classes.length === 0) rows.push(["No classes available"]);
    classes.forEach((classInfo) => {
      const { list, dates, metadata } = classFileRows(classInfo);
      rows.push(...metadata, ["Attendance detail — each class is listed separately"], ["Registration No.", "Student Name", ...dates.map((date, index) => `Class ${index + 1} (${date})`), "Total Present / Classes Taken"]);
      list.forEach((student) => {
        let present = 0;
        const cells = dates.map((date) => {
          const record = attendance.find((item) => item.studentId === student.id && item.date === date);
          if (record?.status === "Present") present++;
          return record ? (record.status === "Present" ? "P" : "A") : "Not recorded";
        });
        rows.push([student.registrationNumber, student.fullName, ...cells, `${present}/${dates.length}`]);
      });
      rows.push([], []);
    });
    rows.push(["Legend", "P = Present", "A = Absent", "Not recorded = attendance not entered for that student/session"]);
    downloadCsv("teachtrack-all-classes-attendance-detail.csv", rows);
  }

  function downloadAllAssessmentFile(category: "Assignment" | "Quiz" | "Exams") {
    const rows: (string | number)[][] = [[`TeachTrack — All Classes ${category} Detail`], ["Teacher", teacherName || "Teacher"], ["Teacher Email", teacherEmail], ["Generated On", new Date().toLocaleDateString()], []];
    if (classes.length === 0) rows.push(["No classes available"]);
    classes.forEach((classInfo) => {
      const { list, quizzes, assignments, metadata } = classFileRows(classInfo);
      const assessments = category === "Quiz" ? quizzes : category === "Assignment" ? assignments : getClassAssessments(classInfo.id).filter((item) => item.category === "Midterm Exam" || item.category === "Final Term Exam");
      const title = category === "Exams" ? "Midterm and Final Exam detail" : `${category} detail`;
      rows.push(...metadata, [title], ["Registration No.", "Student Name", ...assessments.map((item, index) => `${item.category === "Midterm Exam" ? "Midterm" : item.category === "Final Term Exam" ? "Final Exam" : category} ${index + 1}: ${item.assessmentName} (score/max)`), `Total ${category === "Exams" ? "Exam" : category} Marks`]);
      list.forEach((student) => {
        const cells = assessments.map((assessment) => {
          const record = marks.find((item) => item.classId === classInfo.id && item.studentId === student.id && item.category === assessment.category && item.assessmentName === assessment.assessmentName);
          return record ? `${record.score}/${record.total}` : "—";
        });
        const categoryRecords = marks.filter((item) => item.classId === classInfo.id && item.studentId === student.id && (category === "Exams" ? item.category === "Midterm Exam" || item.category === "Final Term Exam" : item.category === category));
        const totalScore = categoryRecords.reduce((sum, item) => sum + item.score, 0);
        const totalPossible = categoryRecords.reduce((sum, item) => sum + item.total, 0);
        rows.push([student.registrationNumber, student.fullName, ...cells, categoryRecords.length ? `${totalScore}/${totalPossible}` : "—"]);
      });
      rows.push([], []);
    });
    const suffix = category.toLowerCase().replace(/\s+/g, "-");
    downloadCsv(`teachtrack-all-classes-${suffix}-detail.csv`, rows);
  }

  function downloadAllMarksSummaryFile() {
    const rows: (string | number)[][] = [["TeachTrack — All Classes Marks Summary"], ["Teacher", teacherName || "Teacher"], ["Teacher Email", teacherEmail], ["Generated On", new Date().toLocaleDateString()], [], ["Class", "Subject", "Registration No.", "Student Name", "Total Assignment Marks", "Total Quiz Marks", "Mid Exam Marks", "Final Exam Marks"]];
    classes.forEach((classInfo) => {
      students.filter((student) => student.classId === classInfo.id).forEach((student) => {
        const assignment = getCategorySummary(student.id, "Assignment");
        const quiz = getCategorySummary(student.id, "Quiz");
        const mid = getCategorySummary(student.id, "Midterm Exam");
        const final = getCategorySummary(student.id, "Final Term Exam");
        rows.push([classInfo.className, classInfo.subjectName, student.registrationNumber, student.fullName, assignment ? `${assignment.score}/${assignment.total}` : "—", quiz ? `${quiz.score}/${quiz.total}` : "—", mid ? `${mid.score}/${mid.total}` : "—", final ? `${final.score}/${final.total}` : "—"]);
      });
    });
    downloadCsv("teachtrack-all-classes-marks-summary.csv", rows);
  }

  function downloadStudentRecordFile(student: Student) {
    const classInfo = classes.find((item) => item.id === student.classId);
    const safeStudent = `${student.registrationNumber}-${student.fullName}`.replace(/[^a-z0-9-_]+/gi, "-");
    const studentAttendance = attendance.filter((record) => record.studentId === student.id).sort((a, b) => a.date.localeCompare(b.date));
    const studentMarks = marks.filter((record) => record.studentId === student.id && record.classId === student.classId)
      .sort((a, b) => ["Quiz", "Assignment", "Midterm Exam", "Final Term Exam"].indexOf(a.category) - ["Quiz", "Assignment", "Midterm Exam", "Final Term Exam"].indexOf(b.category) || a.assessmentName.localeCompare(b.assessmentName, undefined, { numeric: true, sensitivity: "base" }));
    const rows: (string | number)[][] = [
      ["Student Individual Record"],
      ["Student Name", student.fullName],
      ["Registration No.", student.registrationNumber],
      ["Class", classInfo?.className ?? ""],
      ["Subject", classInfo?.subjectName ?? ""],
      ["Semester / Term", classInfo?.semester ?? ""],
      ["Academic Year", classInfo?.academicYear ?? ""],
      ["Teacher", teacherName || "Teacher"],
      ["Generated On", new Date().toLocaleDateString()],
      [],
      ["Attendance Detail"],
      ["Class Date", "Status"],
      ...studentAttendance.map((record) => [record.date, record.status]),
      ["Total Present / Sessions Recorded", `${studentAttendance.filter((record) => record.status === "Present").length}/${studentAttendance.length}`],
      ["Attendance Percentage", studentAttendance.length ? `${Math.round(studentAttendance.filter((record) => record.status === "Present").length / studentAttendance.length * 100)}%` : "Not recorded"],
      [],
      ["Assessment Detail"],
      ["Category", "Assessment", "Obtained Marks", "Maximum Marks"],
      ...studentMarks.map((record) => [record.category, record.assessmentName, record.score, record.total]),
      [],
      ["Category Totals"],
      ["Category", "Obtained / Maximum", "Percentage"],
      ...(["Assignment", "Quiz", "Midterm Exam", "Final Term Exam"] as AssessmentCategory[]).map((category) => {
        const categoryRecords = studentMarks.filter((record) => record.category === category);
        const score = categoryRecords.reduce((sum, record) => sum + record.score, 0);
        const total = categoryRecords.reduce((sum, record) => sum + record.total, 0);
        return [category, categoryRecords.length ? `${score}/${total}` : "Not entered", total ? `${Math.round(score / total * 100)}%` : "—"];
      }),
    ];
    downloadCsv(`${safeStudent}-individual-record.csv`, rows);
  }

  function closeModal() {
    setModal(null);
    setError("");
  }

  function navigate(view: View) {
    setActiveView(view);
    setSelectedClass(null);
    setSearch("");
  }

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !teacherId) {
      setError("You are not connected to Supabase. Please sign in again and check your .env.local settings.");
      return;
    }
    const { data, error: insertError } = await supabase.from("classes").insert({
      teacher_id: teacherId,
      class_name: className.trim(),
      subject_name: subjectName.trim(),
      semester: semester.trim(),
      academic_year: academicYear.trim(),
    }).select("id,class_name,subject_name,semester,academic_year").single();
    if (insertError || !data) {
      setError(insertError?.message ?? "The class could not be saved. Please try again.");
      return;
    }
    const newClass: ClassInfo = {
      id: Number(data.id), className: data.class_name, subjectName: data.subject_name,
      semester: data.semester ?? "", academicYear: data.academic_year ?? "",
    };
    setClasses((previous) => [...previous, newClass]);
    setSelectedClass(null);
    setClassName("");
    setSubjectName("");
    setSemester("");
    setAcademicYear("");
    setActiveView("My Classes");
    closeModal();
  }

  async function handleAddStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass) return;
    setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !teacherId) {
      setError("You are not connected to Supabase. Please sign in again and check your .env.local settings.");
      return;
    }
    const cleanName = fullName.trim();
    const cleanRegistration = registrationNumber.trim();
    const duplicate = students.some(
      (student) => student.classId === selectedClass.id &&
        student.registrationNumber.toLowerCase() === cleanRegistration.toLowerCase()
    );
    if (duplicate) {
      setError("This registration number already exists in this class.");
      return;
    }
    const { data, error: insertError } = await supabase.from("students").insert({
      teacher_id: teacherId,
      class_id: selectedClass.id,
      full_name: cleanName,
      registration_number: cleanRegistration,
    }).select("id,class_id,full_name,registration_number").single();
    if (insertError || !data) {
      setError(insertError?.code === "23505"
        ? "This registration number already exists in this class."
        : insertError?.message ?? "The student could not be saved. Please try again.");
      return;
    }
    const newStudent: Student = {
      id: Number(data.id), classId: Number(data.class_id), fullName: data.full_name,
      registrationNumber: data.registration_number,
    };
    setStudents((previous) => [...previous, newStudent]);
    setFullName("");
    setRegistrationNumber("");
    closeModal();
  }

  function openClass(item: ClassInfo) {
    setSelectedClass(item);
    setActiveView("My Classes");
    setModal(null);
    setError("");
  }

  function openAttendance() {
    if (!selectedClass || classStudents.length === 0) {
      window.alert("Add students to this class before taking attendance.");
      return;
    }
    const existing: Record<number, "Present" | "Absent"> = {};
    classStudents.forEach((student) => {
      const record = attendance.find(
        (item) => item.studentId === student.id && item.date === attendanceDate
      );
      if (record) existing[student.id] = record.status;
    });
    setAttendanceDraft(existing);
    setError("");
    setModal("attendance");
  }

  async function saveAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass) return;
    if (classStudents.length === 0) {
      setError("Add students to this class before taking attendance.");
      return;
    }
    if (classStudents.some((student) => !attendanceDraft[student.id])) {
      setError("Please mark every student Present or Absent.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase || !teacherId) {
      setError("You must be signed in to save attendance. Please sign in again.");
      return;
    }

    setAttendanceSaving(true);
    setError("");
    setDataMessage("");

    try {
      // Read existing rows first so this does not rely on an unverified unique-index name.
      // Every query is scoped to the signed-in teacher, selected class, student, and date.
      for (const student of classStudents) {
        const status = attendanceDraft[student.id];
        const { data: existing, error: lookupError } = await supabase
          .from("attendance")
          .select("id")
          .eq("teacher_id", teacherId)
          .eq("class_id", selectedClass.id)
          .eq("student_id", student.id)
          .eq("attendance_date", attendanceDate)
          .maybeSingle();

        if (lookupError) throw new Error(`Could not check attendance for ${student.fullName}: ${lookupError.message}`);

        if (existing) {
          const { error: updateError } = await supabase
            .from("attendance")
            .update({ status })
            .eq("id", existing.id)
            .eq("teacher_id", teacherId)
            .eq("class_id", selectedClass.id);
          if (updateError) throw new Error(`Could not update attendance for ${student.fullName}: ${updateError.message}`);
        } else {
          const { error: insertError } = await supabase.from("attendance").insert({
            teacher_id: teacherId,
            class_id: selectedClass.id,
            student_id: student.id,
            attendance_date: attendanceDate,
            status,
          });
          if (insertError) throw new Error(`Could not save attendance for ${student.fullName}: ${insertError.message}`);
        }
      }

      const { data: savedRows, error: reloadError } = await supabase
        .from("attendance")
        .select("student_id,attendance_date,status")
        .eq("teacher_id", teacherId);
      if (reloadError) throw new Error(`Attendance was saved, but could not be reloaded: ${reloadError.message}`);

      setAttendance((savedRows ?? []).map((row) => ({
        studentId: Number(row.student_id),
        date: row.attendance_date,
        status: row.status as "Present" | "Absent",
      })));
      setDataMessage(`Attendance saved for ${classStudents.length} students on ${attendanceDate}.`);
      closeModal();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "An unexpected error occurred while saving attendance.";
      setError(message);
    } finally {
      setAttendanceSaving(false);
    }
  }

  function openMarks() {
    if (!selectedClass || classStudents.length === 0) {
      window.alert("Add students to this class before entering marks.");
      return;
    }
    setAssessmentCategory("Quiz");
    setAssessmentName("");
    const existing: Record<number, { score: string; total: string }> = {};
    classStudents.forEach((student) => {
      existing[student.id] = { score: "", total: "100" };
    });
    setMarkDraft(existing);
    setError("");
    setModal("marks");
  }

  async function saveMarks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || marksSaving) return;
    if (!assessmentName.trim()) {
      setError("Enter a name for this assessment, such as Quiz 1 or Assignment 2.");
      return;
    }

    const validated: { student: Student; score: number; total: number }[] = [];
    for (const student of classStudents) {
      const entry = markDraft[student.id];
      if (!entry || entry.score.trim() === "") {
        setError("Please enter marks for every student.");
        return;
      }
      const score = Number(entry.score);
      const total = Number(entry.total);
      if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0 || score < 0 || score > total) {
        setError(`Check the marks for ${student.fullName}. Score must be between 0 and the total marks.`);
        return;
      }
      validated.push({ student, score, total });
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase || !teacherId) {
      setError("You must be signed in to save marks. Please sign in again.");
      return;
    }

    setMarksSaving(true);
    setError("");
    setDataMessage("");
    const normalizedName = assessmentName.trim();
    try {
      // Resolve assessments by querying existing rows instead of relying on an
      // unverified database UNIQUE constraint for PostgREST upsert.
      const { data: candidates, error: findAssessmentError } = await supabase
        .from("assessments")
        .select("id,class_id,category,assessment_name")
        .eq("teacher_id", teacherId)
        .eq("class_id", selectedClass.id)
        .eq("category", assessmentCategory);
      if (findAssessmentError) throw new Error(`Could not check existing assessments: ${findAssessmentError.message}`);

      const matches = (candidates ?? []).filter((row) =>
        String(row.assessment_name).trim().toLowerCase() === normalizedName.toLowerCase()
      );
      if (matches.length > 1) {
        throw new Error("More than one assessment has this name and type in this class. No marks were changed. Please resolve the duplicate assessment records before retrying.");
      }

      let assessmentId: number;
      if (matches.length === 1) {
        assessmentId = Number(matches[0].id);
        const { error: updateAssessmentError } = await supabase
          .from("assessments")
          .update({ assessment_name: normalizedName })
          .eq("id", assessmentId)
          .eq("teacher_id", teacherId)
          .eq("class_id", selectedClass.id);
        if (updateAssessmentError) throw new Error(`Could not update this assessment: ${updateAssessmentError.message}`);
      } else {
        const { data: insertedAssessment, error: insertAssessmentError } = await supabase
          .from("assessments")
          .insert({
            teacher_id: teacherId,
            class_id: selectedClass.id,
            category: assessmentCategory,
            assessment_name: normalizedName,
          })
          .select("id")
          .single();
        if (insertAssessmentError || !insertedAssessment) {
          throw new Error(`Could not create this assessment: ${insertAssessmentError?.message ?? "Assessment ID was not returned."}`);
        }
        assessmentId = Number(insertedAssessment.id);
      }

      // Update or insert each student's mark using a scoped lookup. This avoids
      // assuming that (assessment_id, student_id) has a UNIQUE constraint.
      let savedCount = 0;
      for (const { student, score, total } of validated) {
        const { data: existingRows, error: findMarkError } = await supabase
          .from("marks")
          .select("id")
          .eq("teacher_id", teacherId)
          .eq("assessment_id", assessmentId)
          .eq("student_id", student.id)
          .limit(2);
        if (findMarkError) {
          throw new Error(`Could not check marks for ${student.fullName}: ${findMarkError.message}. Saved ${savedCount} of ${validated.length} student marks; retrying is safe.`);
        }
        if ((existingRows ?? []).length > 1) {
          throw new Error(`Duplicate mark rows exist for ${student.fullName}. Saved ${savedCount} of ${validated.length} student marks; no further marks were changed. Resolve the duplicate rows before retrying.`);
        }

        if (existingRows?.length === 1) {
          const { error: updateMarkError } = await supabase
            .from("marks")
            .update({ class_id: selectedClass.id, score, total })
            .eq("id", Number(existingRows[0].id))
            .eq("teacher_id", teacherId)
            .eq("assessment_id", assessmentId)
            .eq("student_id", student.id);
          if (updateMarkError) {
            throw new Error(`Could not update marks for ${student.fullName}: ${updateMarkError.message}. Saved ${savedCount} of ${validated.length} student marks; retrying is safe.`);
          }
        } else {
          const { error: insertMarkError } = await supabase
            .from("marks")
            .insert({
              teacher_id: teacherId,
              class_id: selectedClass.id,
              assessment_id: assessmentId,
              student_id: student.id,
              score,
              total,
            });
          if (insertMarkError) {
            throw new Error(`Could not insert marks for ${student.fullName}: ${insertMarkError.message}. Saved ${savedCount} of ${validated.length} student marks; retrying is safe.`);
          }
        }
        savedCount += 1;
      }

      const [{ data: savedAssessmentRows, error: reloadAssessmentsError }, { data: savedRows, error: reloadMarksError }] = await Promise.all([
        supabase.from("assessments").select("id,class_id,category,assessment_name").eq("teacher_id", teacherId).order("id"),
        supabase.from("marks").select("id,student_id,class_id,assessment_id,score,total").eq("teacher_id", teacherId),
      ]);
      if (reloadAssessmentsError) throw new Error(`Marks were saved, but assessments could not be refreshed: ${reloadAssessmentsError.message}`);
      if (reloadMarksError) throw new Error(`Marks were saved, but scores could not be refreshed: ${reloadMarksError.message}`);

      const refreshedAssessments: AssessmentRecord[] = (savedAssessmentRows ?? []).map((row) => ({
        id: Number(row.id), classId: Number(row.class_id),
        category: row.category as AssessmentCategory, assessmentName: row.assessment_name,
      }));
      setAssessments(refreshedAssessments);
      const refreshedMarks: MarkRecord[] = (savedRows ?? []).flatMap((row) => {
        const assessment = refreshedAssessments.find((item) => item.id === Number(row.assessment_id));
        if (!assessment) return [];
        return [{
          id: Number(row.id), studentId: Number(row.student_id), classId: Number(row.class_id),
          category: assessment.category, assessmentName: assessment.assessmentName,
          score: Number(row.score), total: Number(row.total),
        }];
      });
      setMarks(refreshedMarks);
      setDataMessage(`Saved ${savedCount} student marks for ${normalizedName}.`);
      closeModal();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "An unexpected error occurred while saving marks.";
      setError(message);
    } finally {
      setMarksSaving(false);
    }
  }

  function getAttendancePercentage(studentId: number) {
    const records = attendance.filter((record) => record.studentId === studentId);
    if (!records.length) return null;
    const presentCount = records.filter((record) => record.status === "Present").length;
    return Math.round((presentCount / records.length) * 100);
  }

  function getStudentMarks(studentId: number) {
    const studentMarks = marks.filter((record) => record.studentId === studentId);
    return studentMarks[studentMarks.length - 1] ?? null;
  }

  function getCategorySummary(studentId: number, category: AssessmentCategory) {
    const records = marks.filter((record) => record.studentId === studentId && record.category === category);
    if (!records.length) return null;
    const score = records.reduce((sum, record) => sum + record.score, 0);
    const total = records.reduce((sum, record) => sum + record.total, 0);
    return { score, total, percentage: Math.round((score / total) * 100), count: records.length };
  }

  function loadAssessmentDraft(category: AssessmentCategory, name: string) {
    if (!selectedClass) return;
    const existingRecords = marks.filter((record) => record.classId === selectedClass.id && record.category === category && record.assessmentName.toLowerCase() === name.trim().toLowerCase());
    const existing: Record<number, { score: string; total: string }> = {};
    classStudents.forEach((student) => {
      const record = existingRecords.find((item) => item.studentId === student.id);
      existing[student.id] = record
        ? { score: String(record.score), total: String(record.total) }
        : { score: "", total: "100" };
    });
    setMarkDraft(existing);
  }

  function editAssessmentForStudent(record: MarkRecord) {
    setAssessmentCategory(record.category);
    setAssessmentName(record.assessmentName);
    loadAssessmentDraft(record.category, record.assessmentName);
    setError("");
    setModal("marks");
  }

  function editAttendanceForStudent(student: Student) {
    const latest = attendance.filter((record) => record.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    setAttendanceDate(latest?.date ?? todayString());
    const existing: Record<number, "Present" | "Absent"> = {};
    classStudents.forEach((item) => {
      const record = attendance.find((entry) => entry.studentId === item.id && entry.date === (latest?.date ?? todayString()));
      if (record) existing[item.id] = record.status;
    });
    setAttendanceDraft(existing);
    setDetailStudent(student);
    setError("");
    setModal("attendance");
  }

  function getClassForStudent(studentId: number) {
    const student = students.find((item) => item.id === studentId);
    return classes.find((item) => item.id === student?.classId);
  }

  function openModal(type: ModalType) {
    setError("");
    setModal(type);
  }

  const pageTitle = selectedClass ? selectedClass.className : activeView;
  const pageSubtitle = selectedClass
    ? `${selectedClass.subjectName} · ${selectedClass.semester} · ${selectedClass.academicYear}`
    : activeView === "Dashboard"
      ? "Here’s an overview of your teaching activity."
      : activeView === "My Classes"
        ? "Create classes and keep student records organized."
        : activeView === "Attendance"
          ? "Review recorded attendance across your classes."
          : activeView === "Marks"
            ? "Review recorded marks and student performance."
            : "A quick overview of your class records.";

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4"><div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-lg"><span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /><span className="text-sm font-semibold text-slate-700">Checking your secure session…</span></div></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="login-shell min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-2">
          <section className="login-visual relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
            <div className="login-orb login-orb-one" /><div className="login-orb login-orb-two" />
            <div className="relative z-10 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold ring-1 ring-white/25">T</div><div><p className="text-xl font-bold">TeachTrack</p><p className="text-sm text-blue-100">Teacher workspace</p></div></div>
            <div className="relative z-10 max-w-lg"><p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">TEACH SMARTER</p><h1 className="mt-4 text-4xl font-bold leading-tight xl:text-5xl">Every class. Every mark. All in one place.</h1><p className="mt-5 max-w-md text-base leading-7 text-blue-100">Organize your students, update attendance, track assessments, and export a clean marks sheet whenever you need it.</p><div className="mt-8 grid grid-cols-3 gap-3">{[["01", "Classes"], ["02", "Attendance"], ["03", "Results"]].map(([number, label]) => <div key={number} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-xs text-blue-200">{number}</p><p className="mt-2 font-semibold">{label}</p></div>)}</div></div>
            <p className="relative z-10 text-xs text-blue-200">A focused workspace for educators.</p>
          </section>
          <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12"><div className="login-card w-full max-w-md"><div className="mb-8 lg:hidden"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">T</div><p className="mt-3 text-xl font-bold">TeachTrack</p></div><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Welcome back</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Sign in to TeachTrack</h2><p className="mt-3 text-sm leading-6 text-slate-500">Enter your teacher details to open your workspace.</p>
            <form onSubmit={handleLogin} className="mt-8 space-y-5"><Field label="Email address"><input autoComplete="email" required type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="teacher@school.edu" className="field-input" /></Field><Field label="Password"><input autoComplete="current-password" required type="password" minLength={4} value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Enter password" className="field-input" /></Field><div className="mt-5">{loginError && <ErrorMessage>{loginError}</ErrorMessage>}</div><button type="submit" disabled={loginSubmitting} className="primary-button login-submit w-full disabled:cursor-not-allowed disabled:opacity-60">{loginSubmitting ? "Signing in…" : "Sign in securely"} <span aria-hidden="true">→</span></button></form>
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800"><strong>Private teacher access:</strong> public registration is not available. Only accounts created by the project owner in Supabase can sign in.</div>
          </div></section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f7fb] text-slate-900">
      {dataMessage && <div role="alert" className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-6 lg:mx-8">{dataMessage}</div>}
      {dataLoading && <div role="status" className="mx-4 mt-3 text-sm text-slate-500 sm:mx-6 lg:mx-8">Loading your saved TeachTrack records…</div>}
      <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="flex flex-col border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-600/20">
              T
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-slate-900">TeachTrack</p>
              <p className="text-xs text-slate-500">Class management</p>
            </div>
          </div>

          <div className="hidden px-4 pb-3 lg:block">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Workspace
            </p>
            <nav className="space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.label)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    activeView === item.label && !selectedClass
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-base shadow-sm ring-1 ring-slate-200/70">
                    {item.icon}
                  </span>
                  {item.label}
                  {item.label === "My Classes" && (
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {classes.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <nav
            aria-label="Primary navigation"
            className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-slate-200/90 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
          >
            {navigation.map((item) => {
              const isActive = activeView === item.label && !selectedClass;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.label)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-w-0 min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight transition-colors focus-visible:outline-offset-[-2px] ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-8 items-center justify-center rounded-lg text-lg leading-none ${
                      isActive ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20" : "text-slate-500"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="max-w-full truncate">{item.label === "My Classes" ? "Classes" : item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden p-4 lg:block">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-lg">
                ✦
              </div>
              <p className="text-sm font-semibold text-slate-800">Keep everything organized</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Manage class lists, attendance and marks in one place.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                T
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">Teacher Workspace</p>
                <p className="text-xs text-slate-500">Local demo account</p>
              </div>
              <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" title="Demo mode" />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Teacher workspace
              </p>
              <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {pageTitle}
              </h1>
              <p className="mt-1 hidden text-sm text-slate-500 sm:block">{pageSubtitle}</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              {!selectedClass && (
                <label className="relative hidden md:block">
                  <span className="sr-only">Search classes</span>
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search classes..."
                    className="w-52 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => openModal("class")}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 sm:px-4"
              >
                <span className="text-lg leading-none">+</span>
                <span className="hidden sm:inline">New class</span>
                <span className="sm:hidden">New</span>
              </button>
              <div className="hidden text-right sm:block"><p className="max-w-36 truncate text-sm font-semibold text-slate-800">{teacherName}</p><p className="max-w-36 truncate text-xs text-slate-500">{teacherEmail}</p></div>
              <button type="button" title="Sign out" onClick={handleSignOut} className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 sm:ml-0">Sign out</button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1500px] min-w-0 space-y-5 p-3 pb-28 sm:space-y-7 sm:p-6 sm:pb-28 lg:p-8 lg:pb-8">
            {selectedClass ? (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => setSelectedClass(null)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  ← Back to classes
                </button>

                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
                  <div className="flex min-w-0 flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start sm:gap-5">
                    <div>
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        Class overview
                      </span>
                      <h2 className="mt-3 break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                        {selectedClass.className}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        {selectedClass.subjectName} · {selectedClass.semester} · {selectedClass.academicYear}
                      </p>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:grid-cols-3">
                      <button type="button" onClick={() => downloadSummaryFile(selectedClass)} className="secondary-button w-full">↓ Marks summary CSV</button>
                      <button type="button" onClick={() => downloadAttendanceDetailFile(selectedClass)} className="secondary-button w-full">↓ Attendance detail CSV</button>
                      <button type="button" onClick={() => downloadAssessmentDetailFile(selectedClass, "Assignment")} className="secondary-button w-full">↓ Assignment detail CSV</button>
                      <button type="button" onClick={() => downloadAssessmentDetailFile(selectedClass, "Quiz")} className="secondary-button w-full">↓ Quiz detail CSV</button>
                      <button type="button" onClick={() => downloadClassMarksSheet(selectedClass)} className="secondary-button w-full sm:col-span-2 lg:col-span-2">↓ Complete marks sheet CSV</button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={openAttendance}
                      className="flex items-center gap-3 rounded-xl bg-blue-600 p-4 text-left text-white transition hover:bg-blue-700"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl">✓</span>
                      <span><span className="block font-semibold">Take attendance</span><span className="mt-1 block text-xs text-blue-100">Record today's class</span></span>
                    </button>
                    <button
                      type="button"
                      onClick={openMarks}
                      className="flex items-center gap-3 rounded-xl bg-emerald-600 p-4 text-left text-white transition hover:bg-emerald-700"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl">▥</span>
                      <span><span className="block font-semibold">Add marks</span><span className="mt-1 block text-xs text-emerald-100">Update student scores</span></span>
                    </button>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm">♙</span>
                      <span><span className="block text-xl font-bold text-slate-900">{classStudents.length}</span><span className="text-xs text-slate-500">Students enrolled</span></span>
                    </div>
                  </div>
                </div>

                <StudentTable
                  students={classStudents}
                  classId={selectedClass.id}
                  marks={marks}
                  getCategorySummary={getCategorySummary}
                  getAttendancePercentage={getAttendancePercentage}
                  onAddStudent={() => openModal("student")}
                  onViewStudent={(student) => { setDetailStudent(student); setModal("studentDetails"); }}
                />
              </div>
            ) : activeView === "Dashboard" ? (
              <DashboardView
                classes={classes}
                students={students}
                attendanceRate={attendanceRate}
                averageMarks={averageMarks}
                filteredClasses={filteredClasses}
                search={search}
                onOpenClass={openClass}
                onNavigate={navigate}
                attendanceCount={attendance.length}
                marksCount={studentsWithMarks}
                attendance={attendance}
                marks={marks}
                onDownloadAllAttendance={downloadAllAttendanceFile}
                onDownloadAllAssignments={() => downloadAllAssessmentFile("Assignment")}
                onDownloadAllQuizzes={() => downloadAllAssessmentFile("Quiz")}
                onDownloadAllExams={() => downloadAllAssessmentFile("Exams")}
                onDownloadAllSummary={downloadAllMarksSummaryFile}
              />
            ) : activeView === "My Classes" ? (
              <ClassesView
                classes={filteredClasses}
                allClassesCount={classes.length}
                students={students}
                search={search}
                setSearch={setSearch}
                onOpenClass={openClass}
              />
            ) : activeView === "Attendance" ? (
              <AttendanceView
                students={students}
                attendance={attendance}
                getClassForStudent={getClassForStudent}
                onOpenClass={openClass}
                onNavigate={navigate}
              />
            ) : activeView === "Marks" ? (
              <MarksView
                classes={classes}
                students={students}
                marks={marks}
                getClassForStudent={getClassForStudent}
                onOpenClass={openClass}
                onNavigate={navigate}
              />
            ) : (
              <ReportsView
                classes={classes}
                students={students}
                attendance={attendance}
                marks={marks}
                attendanceRate={attendanceRate}
                averageMarks={averageMarks}
                onOpenClass={openClass}
                onNavigate={navigate}
              />
            )}
          </div>
        </section>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">TeachTrack</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {modal === "class" && "Create a class"}
                  {modal === "student" && "Add a student"}
                  {modal === "attendance" && "Take attendance"}
                  {modal === "marks" && "Record marks"}
                  {modal === "studentDetails" && "Student performance"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modal === "class" && "Set up the details for your teaching class."}
                  {modal === "student" && "Add a student to the selected class."}
                  {modal === "attendance" && "Choose a status for every student in this session."}
                  {modal === "marks" && "Enter or update each student's score and maximum marks."}
                  {modal === "studentDetails" && "Review this student’s assessments and attendance history."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close dialog"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            {modal === "class" && (
              <form onSubmit={handleCreateClass} className="space-y-4">
                <Field label="Class name">
                  <input required value={className} onChange={(event) => setClassName(event.target.value)} placeholder="e.g. BSSE Semester 3 - Section A" className="field-input" />
                </Field>
                <Field label="Subject name">
                  <input required value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="e.g. Web Development" className="field-input" />
                </Field>
                <Field label="Semester / term">
                  <input required value={semester} onChange={(event) => setSemester(event.target.value)} placeholder="e.g. Semester 3" className="field-input" />
                </Field>
                <Field label="Academic year">
                  <input required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} placeholder="e.g. 2026-2027" className="field-input" />
                </Field>
                {error && <ErrorMessage>{error}</ErrorMessage>}
                <button type="submit" className="primary-button w-full">Create class</button>
              </form>
            )}

            {modal === "student" && (
              <form onSubmit={handleAddStudent} className="space-y-4">
                <Field label="Registration number">
                  <input required value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} placeholder="e.g. SE-001" className="field-input" />
                </Field>
                <Field label="Student full name">
                  <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Ali Khan" className="field-input" />
                </Field>
                {error && <ErrorMessage>{error}</ErrorMessage>}
                <button type="submit" className="primary-button w-full">Save student</button>
              </form>
            )}

            {modal === "attendance" && (
              <form onSubmit={saveAttendance} className="space-y-4">
                <Field label="Attendance date">
                  <input required type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="field-input" />
                </Field>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr><th className="p-3">Student</th><th className="p-3">Status</th></tr>
                    </thead>
                    <tbody>
                      {classStudents.map((student) => (
                        <tr key={student.id} className="border-t border-slate-100">
                          <td className="p-3"><p className="font-semibold text-slate-800">{student.fullName}</p><p className="mt-0.5 text-xs text-slate-500">{student.registrationNumber}</p></td>
                          <td className="p-3">
                            <select required value={attendanceDraft[student.id] ?? ""} onChange={(event) => setAttendanceDraft((previous) => ({ ...previous, [student.id]: event.target.value as "Present" | "Absent" }))} className="w-full min-w-28 rounded-lg border border-slate-200 bg-white p-2.5 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
                              <option value="" disabled>Select status</option>
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {error && <ErrorMessage>{error}</ErrorMessage>}
                <button type="submit" disabled={attendanceSaving} className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-60">{attendanceSaving ? "Saving attendance…" : "Save attendance"}</button>
              </form>
            )}

            {modal === "marks" && (
              <form onSubmit={saveMarks} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Assessment type">
                    <select
                      required
                      value={assessmentCategory}
                      onChange={(event) => { const category = event.target.value as AssessmentCategory; setAssessmentCategory(category); if (assessmentName.trim()) loadAssessmentDraft(category, assessmentName); }}
                      className="field-input"
                    >
                      <option value="Quiz">Quiz</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Midterm Exam">Midterm Exam</option>
                      <option value="Final Term Exam">Final Term Exam</option>
                    </select>
                  </Field>
                  <Field label="Assessment name">
                    <input
                      required
                      value={assessmentName}
                      onChange={(event) => { setAssessmentName(event.target.value); loadAssessmentDraft(assessmentCategory, event.target.value); }}
                      placeholder="e.g. Quiz 1 or Assignment 2"
                      className="field-input"
                    />
                  </Field>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                  Choose the assessment type and give it a name. Saving the same type and name for this class updates those marks; a different name creates a separate assessment.
                </div>
                <div className="space-y-3">
                  {classStudents.map((student) => (
                    <div key={student.id} className="rounded-xl border border-slate-200 p-4">
                      <p className="mb-3 font-semibold text-slate-800">{student.registrationNumber} · {student.fullName}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Score">
                          <input required type="number" min="0" step="any" value={markDraft[student.id]?.score ?? ""} onChange={(event) => setMarkDraft((previous) => ({ ...previous, [student.id]: { score: event.target.value, total: previous[student.id]?.total ?? "100" } }))} placeholder="e.g. 85" className="field-input" />
                        </Field>
                        <Field label="Maximum marks">
                          <input required type="number" min="0.01" step="any" value={markDraft[student.id]?.total ?? "100"} onChange={(event) => setMarkDraft((previous) => ({ ...previous, [student.id]: { score: previous[student.id]?.score ?? "", total: event.target.value } }))} className="field-input" />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
                {error && <ErrorMessage>{error}</ErrorMessage>}
                <button type="submit" disabled={marksSaving} className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-60">{marksSaving ? "Saving marks…" : "Save / update marks"}</button>
              </form>
            )}

            {modal === "studentDetails" && detailStudent && (
              <div className="space-y-5">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-lg font-bold text-slate-900">{detailStudent.fullName}</p>
                  <p className="mt-1 text-sm text-slate-500">Registration No. {detailStudent.registrationNumber}</p>
                  <p className="mt-2 text-xs text-slate-500">Individual record: attendance sessions, every quiz and assignment, midterm, final exam, and category totals.</p>
                  <button type="button" onClick={() => downloadStudentRecordFile(detailStudent)} className="primary-button mt-3">↓ Download this student’s complete record (CSV)</button>
                </div>
                {(["Quiz", "Assignment", "Midterm Exam", "Final Term Exam"] as AssessmentCategory[]).map((category) => {
                  const records = marks.filter((record) => record.studentId === detailStudent.id && record.category === category);
                  const summary = getCategorySummary(detailStudent.id, category);
                  return <div key={category} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><h3 className="font-semibold text-slate-900">{category}</h3><p className="mt-1 text-sm text-slate-500">Total: {summary ? `${summary.score} / ${summary.total} (${summary.percentage}%)` : "Not entered"}</p></div>
                    </div>
                    {records.length > 0 && <div className="mt-3 space-y-2">{records.map((record) => <div key={record.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="min-w-0 truncate text-slate-700">{record.assessmentName}</span><span className="shrink-0 font-semibold">{record.score}/{record.total}</span><button type="button" onClick={() => editAssessmentForStudent(record)} className="shrink-0 font-semibold text-blue-700 hover:underline">Edit</button></div>)}</div>}
                  </div>;
                })}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Attendance</h3><p className="mt-1 text-sm text-slate-500">{getAttendancePercentage(detailStudent.id) === null ? "Not recorded" : `${getAttendancePercentage(detailStudent.id)}% attendance`}</p></div><button type="button" onClick={() => editAttendanceForStudent(detailStudent)} className="secondary-button">Edit attendance</button></div>
                  <div className="mt-3 space-y-1">{attendance.filter((record) => record.studentId === detailStudent.id).sort((a, b) => b.date.localeCompare(a.date)).map((record) => <p key={record.date} className="flex justify-between text-sm"><span className="text-slate-600">{record.date}</span><span className={record.status === "Present" ? "font-medium text-emerald-700" : "font-medium text-rose-700"}>{record.status}</span></p>)}</div>
                </div>
                <button type="button" onClick={closeModal} className="secondary-button w-full">Close details</button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ErrorMessage({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{children}</p>;
}

function StatCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: string;
  tone: "blue" | "violet" | "green" | "amber";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </article>
  );
}

function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function DashboardRecordsTables({
  classes,
  students,
  attendance,
  marks,
}: {
  classes: ClassInfo[];
  students: Student[];
  attendance: AttendanceRecord[];
  marks: MarkRecord[];
}) {
  const [openTable, setOpenTable] = useState<string>("summary");
  const tableDefinitions = [
    { id: "summary", title: "Table 1 — Student short record", description: "Overall quiz, assignment, exam and attendance performance." },
    { id: "attendance", title: "Table 2 — Attendance details", description: "Every recorded session is labelled with its exact date." },
    { id: "assignments", title: "Table 3 — Assignment marks", description: "Marks for each assignment and the total obtained / possible." },
    { id: "quizzes", title: "Table 4 — Quiz marks", description: "Marks for each quiz and the total obtained / possible." },
    { id: "exams", title: "Table 5 — Exam marks", description: "Separate midterm and final exam assessment columns." },
  ];

  function classAssessments(classId: number, categories: AssessmentCategory[]) {
    const unique = new Map<string, { category: AssessmentCategory; assessmentName: string; total: number }>();
    marks.filter((mark) => mark.classId === classId && categories.includes(mark.category)).forEach((mark) => {
      const key = `${mark.category}::${mark.assessmentName}`;
      const existing = unique.get(key);
      if (!existing || mark.total > existing.total) unique.set(key, { category: mark.category, assessmentName: mark.assessmentName, total: mark.total });
    });
    return [...unique.values()].sort((a, b) => a.assessmentName.localeCompare(b.assessmentName, undefined, { numeric: true, sensitivity: "base" }));
  }

  function totalFor(studentId: number, classId: number, categories: AssessmentCategory[]) {
    const records = marks.filter((mark) => mark.studentId === studentId && mark.classId === classId && categories.includes(mark.category));
    return records.length ? `${records.reduce((sum, mark) => sum + mark.score, 0)}/${records.reduce((sum, mark) => sum + mark.total, 0)}` : "—";
  }

  function attendanceFor(classId: number, classStudents: Student[]) {
    const ids = new Set(classStudents.map((student) => student.id));
    const records = attendance.filter((item) => ids.has(item.studentId));
    return [...new Set(records.map((item) => item.date))].sort();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading title="Student records — view tables" subtitle="Expand a table to inspect all relevant student records. Use the report downloads above to save a copy." />
      <div className="mt-4 space-y-3">
        {tableDefinitions.map((definition) => (
          <div key={definition.id} className="overflow-hidden rounded-xl border border-slate-200">
            <button type="button" aria-expanded={openTable === definition.id} onClick={() => setOpenTable(openTable === definition.id ? "" : definition.id)} className="flex w-full items-center justify-between gap-4 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100">
              <span><span className="block text-sm font-semibold text-slate-900">{definition.title}</span><span className="mt-1 block text-xs text-slate-500">{definition.description}</span></span>
              <span aria-hidden="true" className="text-xl text-slate-500">{openTable === definition.id ? "−" : "+"}</span>
            </button>
            {openTable === definition.id && (
              <div className="space-y-5 p-3 sm:p-4">
                {classes.length === 0 ? <p className="text-sm text-slate-500">No classes are available yet.</p> : classes.map((classInfo) => {
                  const classStudents = students.filter((student) => student.classId === classInfo.id);
                  const dates = attendanceFor(classInfo.id, classStudents);
                  const assignments = classAssessments(classInfo.id, ["Assignment"]);
                  const quizzes = classAssessments(classInfo.id, ["Quiz"]);
                  const exams = classAssessments(classInfo.id, ["Midterm Exam", "Final Term Exam"]);
                  const currentAssessments = definition.id === "assignments" ? assignments : definition.id === "quizzes" ? quizzes : exams;
                  const totalColumns = definition.id === "summary" ? 7 : definition.id === "attendance" ? dates.length + 4 : currentAssessments.length + 3;
                  return (
                    <div key={classInfo.id} className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="border-b border-slate-200 bg-white px-3 py-3">
                        <p className="text-sm font-semibold text-slate-900">{classInfo.className} <span className="font-normal text-slate-500">· {classInfo.subjectName}</span></p>
                        <p className="mt-1 text-xs text-slate-500">{classInfo.semester || "Semester not set"} · {classInfo.academicYear || "Academic year not set"} · {classStudents.length} students</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600"><tr>
                            <th className="whitespace-nowrap border-b px-3 py-3 font-semibold">Reg. No.</th>
                            <th className="whitespace-nowrap border-b px-3 py-3 font-semibold">Student name</th>
                            {definition.id === "summary" ? <>
                              <th className="whitespace-nowrap border-b px-3 py-3 font-semibold">Quiz total</th><th className="whitespace-nowrap border-b px-3 py-3 font-semibold">Assignment total</th><th className="whitespace-nowrap border-b px-3 py-3 font-semibold">Midterm</th><th className="whitespace-nowrap border-b px-3 py-3 font-semibold">Final exam</th><th className="whitespace-nowrap border-b px-3 py-3 font-semibold">Attendance %</th>
                            </> : definition.id === "attendance" ? <>
                              {dates.map((date) => <th key={date} className="min-w-28 whitespace-nowrap border-b px-3 py-3 font-semibold">{date}</th>)}<th className="whitespace-nowrap border-b px-3 py-3 font-semibold">Present / sessions</th><th className="whitespace-nowrap border-b px-3 py-3 font-semibold">Attendance %</th>
                            </> : <>
                              {currentAssessments.map((item) => <th key={`${item.category}-${item.assessmentName}`} className="min-w-28 border-b px-3 py-3 font-semibold">{item.assessmentName}<span className="block font-normal text-slate-400">{item.category === "Midterm Exam" ? "Midterm" : item.category === "Final Term Exam" ? "Final exam" : item.category}</span><span className="block font-normal text-slate-400">Max: {item.total}</span></th>)}<th className="whitespace-nowrap border-b px-3 py-3 font-semibold">Total obtained / possible</th>
                            </>}
                          </tr></thead>
                          <tbody>
                            {classStudents.length === 0 ? <tr><td colSpan={totalColumns} className="px-3 py-5 text-center text-slate-500">No students in this class.</td></tr> : classStudents.map((student) => {
                              const studentAttendance = attendance.filter((item) => item.studentId === student.id && dates.includes(item.date));
                              const present = studentAttendance.filter((item) => item.status === "Present").length;
                              const sessionCount = dates.length;
                              const attendancePercent = sessionCount ? Math.round(present / sessionCount * 100) : null;
                              const studentMarks = marks.filter((item) => item.classId === classInfo.id && item.studentId === student.id);
                              return <tr key={student.id} className="odd:bg-white even:bg-slate-50/60">
                                <td className="whitespace-nowrap border-b px-3 py-3 font-medium text-slate-700">{student.registrationNumber}</td><td className="whitespace-nowrap border-b px-3 py-3 text-slate-700">{student.fullName}</td>
                                {definition.id === "summary" ? <>
                                  <td className="whitespace-nowrap border-b px-3 py-3">{totalFor(student.id, classInfo.id, ["Quiz"])}</td><td className="whitespace-nowrap border-b px-3 py-3">{totalFor(student.id, classInfo.id, ["Assignment"])}</td><td className="whitespace-nowrap border-b px-3 py-3">{totalFor(student.id, classInfo.id, ["Midterm Exam"])}</td><td className="whitespace-nowrap border-b px-3 py-3">{totalFor(student.id, classInfo.id, ["Final Term Exam"])}</td><td className="whitespace-nowrap border-b px-3 py-3">{attendancePercent === null ? "—" : `${attendancePercent}%`}</td>
                                </> : definition.id === "attendance" ? <>
                                  {dates.map((date) => { const record = attendance.find((item) => item.studentId === student.id && item.date === date); return <td key={date} className="whitespace-nowrap border-b px-3 py-3">{record ? record.status === "Present" ? "P" : "A" : "—"}</td>; })}<td className="whitespace-nowrap border-b px-3 py-3 font-semibold">{present}/{sessionCount}</td><td className="whitespace-nowrap border-b px-3 py-3">{attendancePercent === null ? "—" : `${attendancePercent}%`}</td>
                                </> : <>
                                  {currentAssessments.map((assessment) => { const record = studentMarks.find((item) => item.category === assessment.category && item.assessmentName === assessment.assessmentName); return <td key={`${assessment.category}-${assessment.assessmentName}`} className="whitespace-nowrap border-b px-3 py-3">{record ? `${record.score}/${record.total}` : "—"}</td>; })}<td className="whitespace-nowrap border-b px-3 py-3 font-semibold">{totalFor(student.id, classInfo.id, definition.id === "assignments" ? ["Assignment"] : definition.id === "quizzes" ? ["Quiz"] : ["Midterm Exam", "Final Term Exam"])}</td>
                                </>}
                              </tr>;
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">P = Present · A = Absent. Attendance column headings use exact dates. A date appears when attendance has been recorded for at least one student in that class; a completely unrecorded session cannot be inferred.</p>
    </section>
  );
}

function DashboardView({
  classes,
  students,
  attendanceRate,
  averageMarks,
  filteredClasses,
  search,
  onOpenClass,
  onNavigate,
  attendanceCount,
  marksCount,
  attendance,
  marks,
  onDownloadAllAttendance,
  onDownloadAllAssignments,
  onDownloadAllQuizzes,
  onDownloadAllExams,
  onDownloadAllSummary,
}: {
  classes: ClassInfo[];
  students: Student[];
  attendanceRate: number | null;
  averageMarks: number | null;
  filteredClasses: ClassInfo[];
  search: string;
  onOpenClass: (item: ClassInfo) => void;
  onNavigate: (view: View) => void;
  attendanceCount: number;
  marksCount: number;
  attendance: AttendanceRecord[];
  marks: MarkRecord[];
  onDownloadAllAttendance: () => void;
  onDownloadAllAssignments: () => void;
  onDownloadAllQuizzes: () => void;
  onDownloadAllExams: () => void;
  onDownloadAllSummary: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-100">YOUR TEACHING AT A GLANCE</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">A clearer way to manage your classes.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              Keep student records, attendance and marks together in one organized workspace.
            </p>
          </div>
          <div className="hidden h-36 w-36 items-center justify-center rounded-full border border-white/20 bg-white/10 text-6xl md:flex">✦</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total classes" value={classes.length} note="Classes in your workspace" icon="▤" tone="blue" />
        <StatCard label="Total students" value={students.length} note="Across all classes" icon="♙" tone="violet" />
        <StatCard label="Attendance rate" value={attendanceRate === null ? "—" : `${attendanceRate}%`} note={`${attendanceCount} attendance records`} icon="✓" tone="green" />
        <StatCard label="Average marks" value={averageMarks === null ? "—" : `${averageMarks}%`} note={`${marksCount} students with marks`} icon="▥" tone="amber" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading title="Download all student records" subtitle="Download records for every student across all your classes from your teacher dashboard." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <button type="button" onClick={onDownloadAllAttendance} className="secondary-button w-full">↓ All attendance details</button>
          <button type="button" onClick={onDownloadAllAssignments} className="secondary-button w-full">↓ All assignment marks</button>
          <button type="button" onClick={onDownloadAllQuizzes} className="secondary-button w-full">↓ All quiz marks</button>
          <button type="button" onClick={onDownloadAllExams} className="secondary-button w-full">↓ All exam marks</button>
          <button type="button" onClick={onDownloadAllSummary} className="primary-button w-full">↓ All-student summary</button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Each download includes all classes currently loaded for this teacher. Attendance and assessment reports are grouped by class, with a row for each student and separate columns for each recorded session or assessment.</p>
      </section>

      <DashboardRecordsTables classes={classes} students={students} attendance={attendance} marks={marks} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <section>
          <SectionHeading
            title="Your classes"
            subtitle="Quickly open a class to manage its students."
            action={<button type="button" onClick={() => onNavigate("My Classes")} className="text-sm font-semibold text-blue-700 hover:text-blue-900">View all →</button>}
          />
          {filteredClasses.length === 0 ? (
            <EmptyState title={search ? "No matching classes" : "Your workspace is ready"} description={search ? "Try another search term." : "Create your first class to start adding students and recording attendance."} action={undefined} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredClasses.slice(0, 4).map((item, index) => {
                const count = students.filter((student) => student.classId === item.id).length;
                return (
                  <button key={item.id} type="button" onClick={() => onOpenClass(item)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${["bg-blue-50 text-blue-700", "bg-violet-50 text-violet-700", "bg-emerald-50 text-emerald-700", "bg-amber-50 text-amber-700"][index % 4]}`}>▤</span>
                      <span className="text-lg text-slate-300 transition group-hover:text-blue-600">↗</span>
                    </div>
                    <h3 className="mt-4 font-bold text-slate-900">{item.className}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.subjectName}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>{item.semester} · {item.academicYear}</span>
                      <span className="font-semibold text-slate-700">{count} students</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <SectionHeading title="Quick actions" subtitle="Common tasks for your classes." />
          <div className="space-y-3">
            <QuickAction icon="✓" title="Record attendance" description="Open a class to take attendance" onClick={() => onNavigate("My Classes")} />
            <QuickAction icon="▥" title="Enter marks" description="Update scores for your students" onClick={() => onNavigate("My Classes")} />
            <QuickAction icon="▧" title="View reports" description="Review attendance and marks summaries" onClick={() => onNavigate("Reports")} />
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickAction({ icon, title, description, onClick }: { icon: string; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-700">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></span>
      <span className="text-slate-400">→</span>
    </button>
  );
}

function ClassesView({
  classes,
  allClassesCount,
  students,
  search,
  setSearch,
  onOpenClass,
}: {
  classes: ClassInfo[];
  allClassesCount: number;
  students: Student[];
  search: string;
  setSearch: (value: string) => void;
  onOpenClass: (item: ClassInfo) => void;
}) {
  return (
    <div>
      <SectionHeading title="My classes" subtitle={`${allClassesCount} class${allClassesCount === 1 ? "" : "es"} created`} />
      <label className="relative mb-5 block md:hidden">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search classes or subjects..." className="field-input pl-9" />
      </label>
      {classes.length === 0 ? (
        <EmptyState title={search ? "No matching classes" : "No classes yet"} description={search ? "Try a different search." : "Create a class to begin organizing your students."} action={undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((item) => {
            const count = students.filter((student) => student.classId === item.id).length;
            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">▤</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{item.className}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.subjectName}</p>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                  <p className="flex justify-between gap-3"><span>Semester / term</span><span className="font-medium text-slate-800">{item.semester}</span></p>
                  <p className="flex justify-between gap-3"><span>Academic year</span><span className="font-medium text-slate-800">{item.academicYear}</span></p>
                  <p className="flex justify-between gap-3"><span>Students</span><span className="font-medium text-slate-800">{count}</span></p>
                </div>
                <button type="button" onClick={() => onOpenClass(item)} className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Open class →</button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentTable({
  students,
  classId,
  marks,
  getCategorySummary,
  getAttendancePercentage,
  onAddStudent,
  onViewStudent,
}: {
  students: Student[];
  classId: number;
  marks: MarkRecord[];
  getCategorySummary: (studentId: number, category: AssessmentCategory) => { score: number; total: number; percentage: number; count: number } | null;
  getAttendancePercentage: (studentId: number) => number | null;
  onAddStudent: () => void;
  onViewStudent: (student: Student) => void;
}) {
  const [studentSearch, setStudentSearch] = useState("");
  const filteredStudents = students.filter((student) =>
    `${student.registrationNumber} ${student.fullName}`.toLowerCase().includes(studentSearch.toLowerCase())
  );
  const categories: AssessmentCategory[] = ["Quiz", "Assignment", "Midterm Exam", "Final Term Exam"];
  const classMarks = marks.filter((record) => record.classId === classId);
  const assessmentColumns = [...new Map(classMarks
    .filter((record) => record.category === "Quiz" || record.category === "Assignment")
    .map((record) => [`${record.category}::${record.assessmentName}`, { category: record.category, assessmentName: record.assessmentName }]))
    .values()]
    .sort((a, b) => categories.indexOf(a.category) - categories.indexOf(b.category) || a.assessmentName.localeCompare(b.assessmentName, undefined, { numeric: true, sensitivity: "base" }));
  function categoryCell(studentId: number, category: AssessmentCategory) {
    const summary = getCategorySummary(studentId, category);
    return summary ? <span title={`${summary.count} assessment(s)`} className="font-semibold text-slate-800">{summary.score}<span className="font-normal text-slate-400">/{summary.total}</span></span> : <span className="text-slate-400">—</span>;
  }
  function assessmentCell(studentId: number, category: AssessmentCategory, assessmentName: string) {
    const record = classMarks.find((item) => item.studentId === studentId && item.category === category && item.assessmentName === assessmentName);
    return record ? <span className="font-medium text-slate-800">{record.score}<span className="font-normal text-slate-400">/{record.total}</span></span> : <span className="text-slate-300">—</span>;
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading title="Student records" subtitle={`${students.length} student${students.length === 1 ? "" : "s"} in this class`} action={<button type="button" onClick={onAddStudent} className="primary-button">+ Add student</button>} />
      <label className="relative mb-4 block max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
        <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search name or registration no." className="field-input pl-9" />
      </label>
      {students.length === 0 ? (
        <EmptyState title="No students added yet" description="Use the Add student button above to add your first student and start tracking marks and attendance." />
      ) : filteredStudents.length === 0 ? (
        <EmptyState title="No matching students" description="Try another name or registration number." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3.5">S.No.</th><th className="px-4 py-3.5">Registration No.</th><th className="px-4 py-3.5">Student Name</th>{assessmentColumns.map((assessment) => <th key={`${assessment.category}-${assessment.assessmentName}`} className="min-w-28 px-4 py-3.5">{assessment.category}: {assessment.assessmentName}</th>)}<th className="px-4 py-3.5">Quiz Total</th><th className="px-4 py-3.5">Assignment Total</th><th className="px-4 py-3.5">Attendance</th><th className="px-4 py-3.5">Midterm</th><th className="px-4 py-3.5">Final Term</th><th className="px-4 py-3.5">Details</th></tr></thead>
            <tbody>
              {filteredStudents.map((student, index) => {
                const attendancePercent = getAttendancePercentage(student.id);
                return <tr key={student.id} className="border-t border-slate-100 transition hover:bg-slate-50/70">
                  <td className="px-4 py-4 text-slate-500">{index + 1}</td>
                  <td className="px-4 py-4 font-medium text-slate-600">{student.registrationNumber}</td>
                  <td className="px-4 py-4 font-semibold text-slate-900">{student.fullName}</td>
                  {assessmentColumns.map((assessment) => <td key={`${assessment.category}-${assessment.assessmentName}`} className="px-4 py-4">{assessmentCell(student.id, assessment.category, assessment.assessmentName)}</td>)}
                  <td className="px-4 py-4">{categoryCell(student.id, categories[0])}</td>
                  <td className="px-4 py-4">{categoryCell(student.id, categories[1])}</td>
                  <td className="px-4 py-4">{attendancePercent === null ? <span className="text-slate-400">—</span> : <span className={`font-semibold ${attendancePercent >= 75 ? "text-emerald-700" : "text-amber-700"}`}>{attendancePercent}%</span>}</td>
                  <td className="px-4 py-4">{categoryCell(student.id, categories[2])}</td>
                  <td className="px-4 py-4">{categoryCell(student.id, categories[3])}</td>
                  <td className="px-4 py-4"><button type="button" onClick={() => onViewStudent(student)} className="font-semibold text-blue-700 hover:underline">View details</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-slate-400">Each saved quiz and assignment has its own score column. Quiz Total and Assignment Total add all assessments in that category. Scroll horizontally to see every assessment on smaller screens. Select View details to inspect or edit a student's history.</p>
    </section>
  );
}

function AttendanceView({
  students,
  attendance,
  getClassForStudent,
  onOpenClass,
  onNavigate,
}: {
  students: Student[];
  attendance: AttendanceRecord[];
  getClassForStudent: (studentId: number) => ClassInfo | undefined;
  onOpenClass: (item: ClassInfo) => void;
  onNavigate: (view: View) => void;
}) {
  const present = attendance.filter((record) => record.status === "Present").length;
  const absent = attendance.filter((record) => record.status === "Absent").length;
  const uniqueDates = new Set(attendance.map((record) => record.date)).size;
  return (
    <div className="space-y-6">
      <SectionHeading title="Attendance" subtitle="Attendance summaries from the sessions you have recorded." action={<button type="button" onClick={() => onNavigate("My Classes")} className="primary-button">Take attendance →</button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Attendance records" value={attendance.length} note="Student statuses saved" icon="✓" tone="blue" />
        <StatCard label="Present" value={present} note="Present records" icon="+" tone="green" />
        <StatCard label="Sessions recorded" value={uniqueDates} note="Unique dates across classes" icon="◷" tone="violet" />
      </div>
      {attendance.length === 0 ? (
        <EmptyState title="No attendance recorded" description="Open one of your classes, choose Take Attendance, and save a session.">
          <button type="button" onClick={() => onNavigate("My Classes")} className="primary-button">Open my classes</button>
        </EmptyState>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeading title="Recent attendance records" subtitle={`${absent} absent records across all classes`} />
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Date</th><th className="p-4">Registration No.</th><th className="p-4">Student</th><th className="p-4">Class</th><th className="p-4">Status</th></tr></thead>
              <tbody>
                {[...attendance].sort((a, b) => b.date.localeCompare(a.date)).map((record, index) => {
                  const student = students.find((item) => item.id === record.studentId);
                  const classInfo = getClassForStudent(record.studentId);
                  if (!student) return null;
                  return <tr key={`${record.studentId}-${record.date}-${index}`} className="border-t border-slate-100"><td className="p-4 text-slate-600">{record.date}</td><td className="p-4 text-slate-600">{student.registrationNumber}</td><td className="p-4 font-semibold text-slate-800">{student.fullName}</td><td className="p-4"><button type="button" onClick={() => classInfo && onOpenClass(classInfo)} className="font-medium text-blue-700 hover:underline">{classInfo?.className ?? "—"}</button></td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.status === "Present" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{record.status}</span></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function MarksView({
  classes,
  students,
  marks,
  getClassForStudent,
  onOpenClass,
  onNavigate,
}: {
  classes: ClassInfo[];
  students: Student[];
  marks: MarkRecord[];
  getClassForStudent: (studentId: number) => ClassInfo | undefined;
  onOpenClass: (item: ClassInfo) => void;
  onNavigate: (view: View) => void;
}) {
  const average = marks.length ? Math.round(marks.reduce((sum, item) => sum + (item.score / item.total) * 100, 0) / marks.length) : null;
  return (
    <div className="space-y-6">
      <SectionHeading title="Marks" subtitle="Review recorded student scores across your classes." action={<button type="button" onClick={() => onNavigate("My Classes")} className="primary-button">Enter marks →</button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Scores recorded" value={marks.length} note="Students with a score" icon="▥" tone="blue" />
        <StatCard label="Average score" value={average === null ? "—" : `${average}%`} note="Normalized across maximum marks" icon="◉" tone="green" />
        <StatCard label="Classes" value={classes.length} note="Available to manage" icon="▤" tone="violet" />
      </div>
      {marks.length === 0 ? (
        <EmptyState title="No marks entered yet" description="Open a class and select Add Marks to record student scores.">
          <button type="button" onClick={() => onNavigate("My Classes")} className="primary-button">Choose a class</button>
        </EmptyState>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeading title="Assessment marks" subtitle="Scores grouped by quiz, assignment, midterm, and final term exam" />
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">S.No.</th><th className="p-4">Registration No.</th><th className="p-4">Student</th><th className="p-4">Class</th><th className="p-4">Assessment Type</th><th className="p-4">Assessment Name</th><th className="p-4">Score</th><th className="p-4">Percentage</th></tr></thead>
              <tbody>
                {marks.map((record, index) => {
                  const student = students.find((item) => item.id === record.studentId);
                  const classInfo = getClassForStudent(record.studentId);
                  if (!student) return null;
                  const percent = Math.round((record.score / record.total) * 100);
                  return <tr key={record.id} className="border-t border-slate-100"><td className="p-4 text-slate-500">{index + 1}</td><td className="p-4 text-slate-600">{student.registrationNumber}</td><td className="p-4 font-semibold text-slate-800">{student.fullName}</td><td className="p-4"><button type="button" onClick={() => classInfo && onOpenClass(classInfo)} className="font-medium text-blue-700 hover:underline">{classInfo?.className ?? "—"}</button></td><td className="p-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{record.category}</span></td><td className="p-4 text-slate-700">{record.assessmentName}</td><td className="p-4 font-semibold">{record.score}/{record.total}</td><td className="p-4"><span className={`font-semibold ${percent >= 50 ? "text-emerald-700" : "text-rose-700"}`}>{percent}%</span></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ReportsView({
  classes,
  students,
  attendance,
  marks,
  attendanceRate,
  averageMarks,
  onOpenClass,
  onNavigate,
}: {
  classes: ClassInfo[];
  students: Student[];
  attendance: AttendanceRecord[];
  marks: MarkRecord[];
  attendanceRate: number | null;
  averageMarks: number | null;
  onOpenClass: (item: ClassInfo) => void;
  onNavigate: (view: View) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeading title="Reports" subtitle="A summary of your current class data." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Classes" value={classes.length} note="Total classes" icon="▤" tone="blue" />
        <StatCard label="Students" value={students.length} note="Total enrolled records" icon="♙" tone="violet" />
        <StatCard label="Attendance" value={attendanceRate === null ? "—" : `${attendanceRate}%`} note="Overall present rate" icon="✓" tone="green" />
        <StatCard label="Average marks" value={averageMarks === null ? "—" : `${averageMarks}%`} note="Across recorded scores" icon="▥" tone="amber" />
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeading title="Class summaries" subtitle="Select a class to review individual student records." />
        {classes.length === 0 ? (
          <EmptyState title="Nothing to report yet" description="Create a class and add students to start building your reports." action={<button type="button" onClick={() => onNavigate("My Classes")} className="primary-button">Go to classes</button>} />
        ) : (
          <div className="space-y-3">
            {classes.map((item) => {
              const classStudentList = students.filter((student) => student.classId === item.id);
              const classStudentIds = new Set(classStudentList.map((student) => student.id));
              const classAttendance = attendance.filter((record) => classStudentIds.has(record.studentId));
              const classPresent = classAttendance.filter((record) => record.status === "Present").length;
              const classRate = classAttendance.length ? Math.round((classPresent / classAttendance.length) * 100) : null;
              const classMarks = marks.filter((record) => classStudentIds.has(record.studentId));
              const classAverage = classMarks.length ? Math.round(classMarks.reduce((sum, record) => sum + (record.score / record.total) * 100, 0) / classMarks.length) : null;
              return (
                <button key={item.id} type="button" onClick={() => onOpenClass(item)} className="grid w-full gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30 sm:grid-cols-[minmax(0,1fr)_110px_110px_auto] sm:items-center">
                  <span><span className="block font-semibold text-slate-900">{item.className}</span><span className="mt-1 block text-sm text-slate-500">{item.subjectName} · {item.semester}</span></span>
                  <span><span className="block text-xs text-slate-400">Students</span><span className="mt-1 block font-semibold text-slate-800">{classStudentList.length}</span></span>
                  <span><span className="block text-xs text-slate-400">Attendance</span><span className="mt-1 block font-semibold text-slate-800">{classRate === null ? "—" : `${classRate}%`}</span></span>
                  <span className="text-sm font-semibold text-blue-700">Details →</span>
                  <span className="sr-only">Average marks: {classAverage === null ? "not entered" : `${classAverage}%`}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      <p className="text-xs leading-5 text-slate-400">Reports use the current browser session. Download a class marks sheet from the class overview to share a CSV copy.</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500">✦</div>
      <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {(action || children) && <div className="mt-5 flex justify-center">{action ?? children}</div>}
    </div>
  );
}
