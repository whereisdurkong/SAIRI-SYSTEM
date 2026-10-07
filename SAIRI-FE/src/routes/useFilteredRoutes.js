// hooks/useFilteredRoutes.js
import { useMemo } from "react";
import routes from "routes.js";

export default function useFilteredRoutes() {
  return useMemo(() => {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const dept = (user.emp_department || "").toLowerCase();

    return routes.filter((route) => {
      if (!route.requiredDepartment) return true;
      return dept === route.requiredDepartment.toLowerCase();
    });
  }, []);
}
