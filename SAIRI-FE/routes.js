
import Index from "views/Index.js";
import Profile from "views/examples/Profile.js";
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

var routes1 = [
  {
    path: "/auth-login",
    name: "Login",
    icon: "ni ni-key-25 text-info",
    component: <AuthLogin />,
    layout: "/auth",
    showInNav: false,
  },
  {
    path: "/auth-register",
    name: "Register",
    icon: "ni ni-circle-08 text-pink",
    component: <AuthRegister />,
    layout: "/auth",
    showInNav: true,
  },
  {
    path: "/add-report",
    name: "Add Report",
    icon: "ni ni-circle-08 text-pink",
    component: <AddReport />,
    layout: "/admin",
    showInNav: true,
  },
  {
    path: "/all-reports",
    name: "All Reports",
    icon: "ni ni-circle-08 text-pink",
    component: <AllReport />,
    layout: "/admin",
    showInNav: true,
  },
  {
    path: "/view-report",
    name: "View Report",
    icon: "ni ni-circle-08 text-pink",
    component: <ViewReport />,
    layout: "/admin",
    showInNav: false,
  },
  {
    path: "/setup-group-department",
    name: "Setup Group Department",
    icon: "ni ni-circle-08 text-pink",
    component: <SetupGroupDepartment />,
    layout: "/admin",
    showInNav: false,
  },
  {
    path: "/all-group-department",
    name: "Setup Group Department",
    icon: "ni ni-circle-08 text-pink",
    component: <AllGroupDepartment />,
    layout: "/admin",
    showInNav: false,
  },
  {
    path: "/admin-setup",
    name: "Admin Setup",
    icon: "ni ni-circle-08 text-pink",
    component: <AdminSetup />,
    layout: "/admin",
    showInNav: true,
  },


  {

    path: "/index",
    name: "Dashboard",
    icon: "ni ni-tv-2 text-primary",
    component: <Index />,
    layout: "/admin",
    showInNav: true,
  },
  {
    path: "/icons",
    name: "Icons",
    icon: "ni ni-planet text-blue",
    component: <Icons />,
    layout: "/admin",
  },
  {
    path: "/maps",
    name: "Maps",
    icon: "ni ni-pin-3 text-orange",
    component: <Maps />,
    layout: "/admin",
  },
  {
    path: "/user-profile",
    name: "User Profile",
    icon: "ni ni-single-02 text-yellow",
    component: <Profile />,
    layout: "/admin",
  },
  {
    path: "/tables",
    name: "Tables",
    icon: "ni ni-bullet-list-67 text-red",
    component: <Tables />,
    layout: "/admin",
  },
  {
    path: "/login",
    name: "Login",
    icon: "ni ni-key-25 text-info",
    component: <Login />,
    layout: "/auth",
  },
  {
    path: "/register",
    name: "Register",
    icon: "ni ni-circle-08 text-pink",
    component: <Register />,
    layout: "/auth",
  },
];
export default routes1;
