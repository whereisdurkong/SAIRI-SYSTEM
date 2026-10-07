import { useState } from "react";
import { NavLink as NavLinkRRD, Link } from "react-router-dom";
import { PropTypes } from "prop-types";
import {
  Collapse,
  NavbarBrand,
  Navbar,
  NavItem,
  NavLink,
  Nav,
  Container,
  Row,
  Col,
} from "reactstrap";

// ✅ SidebarNavLink stays clean — no filtering logic here
const SidebarNavLink = ({ prop, closeCollapse }) => {
  const [hovered, setHovered] = useState(false);
  const IconComponent = prop.icon;

  return (
    <NavItem style={{ background: hovered ? `${prop.color}12` : "#ffffff" }}>
      <NavLink
        to={prop.layout + prop.path}
        tag={NavLinkRRD}
        onClick={closeCollapse}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          fontSize: hovered ? "17px" : "15px",
          fontWeight: hovered ? "700" : "500",
          transition: "font-size 0.15s ease",
          color: hovered ? prop.color : "#4e4e4e",
        }}
      >
        {IconComponent && (
          <IconComponent
            size={hovered ? 24 : 20}
            color={prop.color || "#1561b9"}
            className="mr-2"
          />
        )}
        {prop.name}
      </NavLink>
    </NavItem>
  );
};

const Sidebar = (props) => {
  const [collapseOpen, setCollapseOpen] = useState();

  // ✅ Filtering lives here, inside Sidebar, where props is defined
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userDept = (user.emp_department || "").toLowerCase();

  const routes = props.routes.filter((route) => {
    // hide routes restricted to another department
    if (
      route.requiredDepartment &&
      userDept !== route.requiredDepartment.toLowerCase()
    )
      return false;
    // hide routes explicitly excluded for this department
    if (
      route.hiddenForDepartment &&
      userDept === route.hiddenForDepartment.toLowerCase()
    )
      return false;
    return true;
  });

  const { bgColor, logo } = props;

  const dashboardAdminRoutes = routes.filter((r) => r.section === "dashboard");
  const adminRoutes = routes.filter((r) => r.section === "admin");
  const toolsRoutes = routes.filter((r) => r.section === "tools");
  const ProfileRoutes = routes.filter((r) => r.section === "profile");

  const toggleCollapse = () => setCollapseOpen((data) => !data);
  const closeCollapse = () => setCollapseOpen(false);

  const createLinks = (routeList) =>
    routeList
      .filter((prop) => prop.showInNav !== false)
      .map((prop, key) => (
        <SidebarNavLink key={key} prop={prop} closeCollapse={closeCollapse} />
      ));

  let navbarBrandProps;
  if (logo && logo.innerLink) {
    navbarBrandProps = { to: logo.innerLink, tag: Link };
  } else if (logo && logo.outterLink) {
    navbarBrandProps = { href: logo.outterLink, target: "_blank" };
  }

  return (
    <Navbar
      className="navbar-vertical fixed-left navbar-light bg-white"
      expand="md"
      id="sidenav-main"
      style={{ zIndex: "9999", background: "#0D1B2A" }}
    >
      <Container fluid>
        <button
          className="navbar-toggler"
          type="button"
          onClick={toggleCollapse}
        >
          <span className="navbar-toggler-icon" />
        </button>

        {logo ? (
          <NavbarBrand className="pt-10 mx-auto mx-md-0" {...navbarBrandProps}>
            <img
              alt={logo.imgAlt}
              className="navbar-brand-img"
              src={logo.imgSrc}
            />
          </NavbarBrand>
        ) : null}

        <Collapse navbar isOpen={collapseOpen}>
          <div className="navbar-collapse-header d-md-none">
            <Row>
              {logo ? (
                <Col className="collapse-brand" xs="6">
                  {logo.innerLink ? (
                    <Link to={logo.innerLink}>
                      <img alt={logo.imgAlt} src={logo.imgSrc} />
                    </Link>
                  ) : (
                    <a href={logo.outterLink}>
                      <img alt={logo.imgAlt} src={logo.imgSrc} />
                    </a>
                  )}
                </Col>
              ) : null}
              <Col className="collapse-close" xs="6">
                <button
                  className="navbar-toggler"
                  type="button"
                  onClick={toggleCollapse}
                >
                  <span />
                  <span />
                </button>
              </Col>
            </Row>
          </div>

          {dashboardAdminRoutes.length > 0 && (
            <Nav navbar>{createLinks(dashboardAdminRoutes)}</Nav>
          )}

          {toolsRoutes.length > 0 && (
            <>
              <hr className="my-3" />
              <h6
                className="navbar-heading"
                style={{ color: "#145700", fontWeight: "bold" }}
              >
                Tools
              </h6>
              <Nav navbar>{createLinks(toolsRoutes)}</Nav>
            </>
          )}

          {adminRoutes.length > 0 && (
            <>
              <hr className="my-3" />
              <h6
                className="navbar-heading"
                style={{ color: "#145700", fontWeight: "bold" }}
              >
                ADMIN
              </h6>
              <Nav navbar>{createLinks(adminRoutes)}</Nav>
            </>
          )}

          {ProfileRoutes.length > 0 && (
            <>
              <hr className="my-3" />
              <h6
                className="navbar-heading"
                style={{ color: "#145700", fontWeight: "bold" }}
              >
                PROFILE
              </h6>
              <Nav navbar>{createLinks(ProfileRoutes)}</Nav>
            </>
          )}
        </Collapse>
      </Container>
    </Navbar>
  );
};

Sidebar.defaultProps = { routes: [{}] };

Sidebar.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.object),
  logo: PropTypes.shape({
    innerLink: PropTypes.string,
    outterLink: PropTypes.string,
    imgSrc: PropTypes.string.isRequired,
    imgAlt: PropTypes.string.isRequired,
  }),
};

export default Sidebar;
