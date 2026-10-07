import Index from "views/Index.js";
import Maps from "views/examples/Maps.js";
import Register from "views/examples/Register.js";
import Login from "views/examples/Login.js";
import Tables from "views/examples/Tables.js";
import Icons from "views/examples/Icons.js";

import AuthLogin from "views/auth/auth-login.jsx";
import AuthRegister from "views/auth/auth-register.jsx";

import AddReport from "views/report/addReport.jsx";
import AllReport from "views/report/allReport.jsx";
import ViewReport from "views/report/viewReport";
import SetupGroupDepartment from "views/admin/setupGroupDepartment/setup-group-department";
import AllGroupDepartment from "views/admin/setupGroupDepartment/all-group-department";
import AdminSetup from "views/admin/admin-setup";

import {
  Key,
  UserPlus,
  FilePlus,
  FileText,
  Eye,
  Layers,
  List,
  Settings,
  Compass,
  MapPin,
  User,
  Table,
  LogIn,
  Tool,
  Grid,
  LogOut,
} from "react-feather";
import AllUsers from "views/admin/all-users";
import Permission from "views/admin/permission";
import LogOut1 from "views/auth/logout";
import Profile from "views/auth/profile";
import AddSection3Report from "views/report/addReportMedical";
import AMR from "views/amr";
import SetupHeads from "views/admin/setupHeadUsers/setup-heads";
import Occupation from "views/amr/occupation";
import AMRDashboard from "views/amr/amrDashboard";
import MainDashboard from "views/amr/maindashboard";

// ✅ useEffect import and call removed entirely

var routes = [
  {
    path: "/auth-login",
    name: "Login",
    icon: Key,
    component: <AuthLogin />,
    layout: "/auth",
    showInNav: false,
  },
  {
    path: "/index",
    name: "Dashboard",
    icon: Grid,
    component: <MainDashboard />,
    layout: "/admin",
    showInNav: true,
    section: "dashboard",
    color: "#ff6600",
  },
  {
    path: "/AMR",
    name: "AMR",
    icon: Table,
    component: <AMR />,
    layout: "/admin",
    showInNav: false,
    section: "dashboard",
    color: "#c99300",
  },
  {
    path: "/AMR-Dashboard",
    name: "AMR DASHBOARD",
    icon: Table,
    component: <AMRDashboard />,
    layout: "/admin",
    showInNav: true,
    section: "dashboard",
    color: "#c99300",
  },
  {
    path: "/add-report",
    name: "Add Report",
    icon: FilePlus,
    component: <AddReport />,
    layout: "/admin",
    showInNav: true,
    section: "tools",
    color: "#fd0303",
    hiddenForDepartment: "medical", // ✅ hide for medical
  },
  {
    path: "/medical-add-report",
    name: "Add Report Medical",
    icon: FilePlus,
    component: <AddSection3Report />,
    layout: "/admin",
    showInNav: true,
    section: "tools",
    color: "#fd0303",
    requiredDepartment: "medical", // ✅ Medical only
  },
  {
    path: "/all-reports",
    name: "All Reports",
    icon: FileText,
    component: <AllReport />,
    layout: "/admin",
    showInNav: true,
    section: "tools",
    color: "#5e72e4",
  },
  {
    path: "/view-report",
    name: "View Report",
    icon: Eye,
    component: <ViewReport />,
    layout: "/admin",
    showInNav: false,
    section: "tools",
  },
  {
    path: "/profile",
    name: "Profile",
    icon: User,
    component: <Profile />,
    layout: "/admin",
    showInNav: true,
    section: "profile",
    color: "#047400",
  },
  {
    path: "/out",
    name: "Log out",
    icon: LogOut,
    component: <LogOut1 />,
    layout: "/admin",
    showInNav: true,
    section: "profile",
    color: "#002574",
  },
  {
    path: "/auth-register",
    name: "Register",
    icon: UserPlus,
    component: <AuthRegister />,
    layout: "/admin",
    showInNav: false,
    section: "admin",
    color: "#047400",
  },
  {
    path: "/all-system-users",
    name: "Users Manager",
    icon: Grid,
    component: <AllUsers />,
    layout: "/admin",
    showInNav: true,
    section: "admin",
    color: "#0f5534",
  },
  {
    path: "/setup-group-department",
    name: "Setup Group Department",
    icon: Layers,
    component: <SetupGroupDepartment />,
    layout: "/admin",
    showInNav: false,
    section: "admin",
  },
  {
    path: "/all-group-department",
    name: "Setup Group Department",
    icon: List,
    component: <AllGroupDepartment />,
    layout: "/admin",
    showInNav: false,
    section: "admin",
  },
  {
    path: "/admin-setup",
    name: "Admin Setup",
    icon: Settings,
    component: <AdminSetup />,
    layout: "/admin",
    showInNav: true,
    section: "admin",
    color: "#70278d",
  },
  {
    path: "/admin-setup-permission",
    name: "Permission",
    icon: Settings,
    component: <Permission />,
    layout: "/admin",
    showInNav: false,
    section: "admin",
    color: "#70278d",
  },
  {
    path: "/admin-setup-head",
    name: "User Group Setup",
    icon: Settings,
    component: <SetupHeads />,
    layout: "/admin",
    showInNav: false,
    section: "admin",
    color: "#70278d",
  },
  {
    path: "/icons",
    name: "Icons",
    icon: Compass,
    component: <Icons />,
    layout: "/admin",
  },
  {
    path: "/maps",
    name: "Maps",
    icon: MapPin,
    component: <Maps />,
    layout: "/admin",
  },
  {
    path: "/user-profile",
    name: "User Profile",
    icon: User,
    component: <Profile />,
    layout: "/admin",
  },
  {
    path: "/tables",
    name: "Tables",
    icon: Table,
    component: <Tables />,
    layout: "/admin",
  },
  {
    path: "/login",
    name: "Login",
    icon: LogIn,
    component: <Login />,
    layout: "/auth",
  },
  {
    path: "/register",
    name: "Register",
    icon: Tool,
    component: <Register />,
    layout: "/auth",
    showInNav: true,
  },
];

export default routes;
