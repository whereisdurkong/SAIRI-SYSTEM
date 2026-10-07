
import { Row, Col, Nav, NavItem, NavLink } from "reactstrap";

const Footer = () => {
  return (
    <footer className="footer">
      <Row className="align-items-center justify-content-xl-between">
        <Col xl="6">
          <div className="copyright text-center text-xl-left text-muted">
            © {new Date().getFullYear()}{" "}
            <a
              className="font-weight-bold ml-1"
              href="https://www.lepantomining.com/"
              rel="noopener noreferrer"
              target="_blank"
            >
              2026 Lepanto Mine Division
            </a>
          </div>
        </Col>

        <Col xl="6">
          <Nav className="nav-footer justify-content-center justify-content-xl-end" >
            {/* <NavItem>
              <NavLink
                href="https://www.lepantomining.com/"
                rel="noopener noreferrer"
                target="_blank"
              >
                © 2026 Lepanto Mine Division
              </NavLink>
            </NavItem> */}

            <NavItem >
              <NavLink
                href="https://adrian-ventura.vercel.app/"
                rel="noopener noreferrer"
                target="_blank"

              >
                by adriankurtventura
              </NavLink>
            </NavItem>


          </Nav>
        </Col>
      </Row>
    </footer>
  );
};

export default Footer;
