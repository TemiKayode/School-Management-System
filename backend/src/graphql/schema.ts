import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  enum Role { ADMIN TEACHER STUDENT PARENT }
  enum AttendanceStatus { PRESENT ABSENT LATE EXCUSED }
  enum PaymentStatus { PENDING PAID FAILED REFUNDED }

  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
    phone: String
    avatar: String
    createdAt: DateTime!
  }

  type Student {
    id: ID!
    admissionNo: String!
    user: User!
    class: Class
    parentName: String
    parentEmail: String
    enrolledAt: DateTime!
    attendance(limit: Int): [Attendance!]!
    examResults: [ExamResult!]!
    feePayments: [FeePayment!]!
  }

  type Teacher {
    id: ID!
    employeeNo: String!
    department: String
    user: User!
    subjects: [Subject!]!
    classes: [Class!]!
  }

  type Class {
    id: ID!
    name: String!
    grade: String!
    section: String
    academicYear: String!
    teacher: Teacher
    students: [Student!]!
    subjects: [Subject!]!
  }

  type Subject {
    id: ID!
    name: String!
    code: String!
    credits: Int!
  }

  type Attendance {
    id: ID!
    date: DateTime!
    status: AttendanceStatus!
    note: String
    student: Student!
  }

  type Exam {
    id: ID!
    title: String!
    examDate: DateTime!
    totalMarks: Int!
    passMark: Int!
    duration: Int!
    subject: Subject!
    class: Class!
    results: [ExamResult!]!
  }

  type ExamResult {
    id: ID!
    score: Float!
    grade: String
    remarks: String
    student: Student!
    exam: Exam!
  }

  type Fee {
    id: ID!
    name: String!
    amount: Float!
    dueDate: DateTime
    academicYear: String!
  }

  type FeePayment {
    id: ID!
    amount: Float!
    status: PaymentStatus!
    method: String!
    createdAt: DateTime!
    fee: Fee!
    student: Student!
  }

  type Assignment {
    id: ID!
    title: String!
    description: String
    dueDate: DateTime!
    totalPoints: Int!
    subject: Subject!
    class: Class!
  }

  type Notification {
    id: ID!
    title: String!
    message: String!
    read: Boolean!
    createdAt: DateTime!
  }

  type Announcement {
    id: ID!
    title: String!
    content: String!
    audience: [String!]!
    pinned: Boolean!
    author: User!
    createdAt: DateTime!
  }

  type DashboardStats {
    totalStudents: Int!
    totalTeachers: Int!
    unreadNotifications: Int!
  }

  type PaginatedStudents {
    data: [Student!]!
    total: Int!
    page: Int!
    pages: Int!
  }

  # ─── Queries ────────────────────────────────────────

  type Query {
    me: User
    dashboard: DashboardStats!

    students(page: Int, limit: Int, search: String): PaginatedStudents!
    student(id: ID!): Student
    teachers(page: Int, limit: Int): [Teacher!]!
    teacher(id: ID!): Teacher
    classes: [Class!]!
    class(id: ID!): Class
    exams(page: Int, limit: Int): [Exam!]!
    exam(id: ID!): Exam
    fees: [Fee!]!
    assignments(classId: ID, subjectId: ID): [Assignment!]!
    notifications: [Notification!]!
    announcements(audience: String): [Announcement!]!
  }

  # ─── Mutations ──────────────────────────────────────

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  type Mutation {
    login(email: String!, password: String!, mfaCode: String): AuthPayload!
    logout: Boolean!
    markAttendance(classId: ID!, date: String!, records: [AttendanceInput!]!): Boolean!
    createAnnouncement(title: String!, content: String!, audience: [String!]!, pinned: Boolean): Announcement!
    markNotificationRead(id: ID!): Boolean!
  }

  input AttendanceInput {
    studentId: ID!
    status: AttendanceStatus!
    note: String
  }

  # ─── Subscriptions ──────────────────────────────────

  type Subscription {
    notificationReceived: Notification!
    messageReceived: MessageEvent!
  }

  type MessageEvent {
    conversationId: ID!
    content: String!
    senderId: ID!
    senderName: String!
  }
`;
