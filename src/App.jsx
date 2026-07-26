import { useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  List,
  X,
} from "@phosphor-icons/react";

const clientOutcomes = [
  {
    number: "01",
    title: "Saber si merece la pena",
    summary: "Viabilidad, riesgos y coste antes de abrir un proyecto completo.",
    detail:
      "Aterrizamos función, usuario, fabricación y restricciones para decidir qué conviene resolver, qué puede esperar y dónde está el riesgo real.",
  },
  {
    number: "02",
    title: "Probar antes de comprometer",
    summary: "Un prototipo que permite decidir con las manos, no solo con renders.",
    detail:
      "Comprobamos ergonomía, mecanismos, montaje y tolerancias antes de comprometer inversión, utillaje o una preserie.",
  },
  {
    number: "03",
    title: "Llegar a taller con respuestas",
    summary: "Documentación clara para fabricar, presupuestar y evolucionar.",
    detail:
      "Entregamos CAD, planos, especificaciones y criterios de validación listos para hablar con proveedores y fabricación.",
  },
];

const projects = [
  {
    code: "FIG 01 — PROTOTIPO",
    title: "Prototipo funcional",
    copy:
      "Una solución física para comprobar uso, montaje y decisiones críticas antes de fabricar.",
    image: "/assets/prototype.webp",
    alt: "Prototipo funcional desarrollado por DONKEY Industrial",
  },
  {
    code: "FIG 02 — DIGITALIZACIÓN",
    title: "Escaneado y reconstrucción",
    copy:
      "Geometría real convertida en información útil para rediseñar, verificar o reproducir.",
    image: "/assets/scan.webp",
    alt: "Escaneado tridimensional de una pieza industrial",
  },
  {
    code: "FIG 03 — UTILLAJE",
    title: "Fixture de verificación",
    copy:
      "Posicionado repetible, menos preparación y una operación que ya no depende de la mano del operario.",
    image: "/assets/fixture.webp",
    alt: "Fixture industrial de verificación diseñado por DONKEY Industrial",
  },
];

function NavLink({ href, children, onClick }) {
  return (
    <a className="nav-link" href={href} onClick={onClick}>
      {children}
    </a>
  );
}

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeProject, setActiveProject] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="DONKEY Industrial, inicio">
          <strong>DONKEY</strong> Industrial
        </a>

        <nav className="desktop-nav" aria-label="Navegación principal">
          <NavLink href="#archivo">Proyectos</NavLink>
          <NavLink href="#proceso">Proceso</NavLink>
          <NavLink href="#marco">Marco</NavLink>
          <NavLink href="#contacto">Contacto</NavLink>
        </nav>

        <button
          className="menu-button"
          type="button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={24} /> : <List size={24} />}
        </button>

        {menuOpen && (
          <nav className="mobile-nav" aria-label="Navegación móvil">
            <NavLink href="#archivo" onClick={closeMenu}>Proyectos</NavLink>
            <NavLink href="#proceso" onClick={closeMenu}>Proceso</NavLink>
            <NavLink href="#marco" onClick={closeMenu}>Marco</NavLink>
            <NavLink href="#contacto" onClick={closeMenu}>Contacto</NavLink>
          </nav>
        )}
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <span className="section-code">DI / CUADERNO 01</span>
          <h1>
            Del <br className="mobile-only" />problema <br className="mobile-only" />real
            <br />
            a una <br className="mobile-only" />solución <br className="mobile-only" />que
            <br />
            <em>aguanta.</em>
          </h1>
          <p>
            Diseñamos, prototipamos y validamos
            <br className="desktop-break" /> antes de fabricar.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#contacto">
              Empezar un proyecto
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </a>
            <a className="text-link" href="#archivo">
              Explorar el archivo
            </a>
          </div>
        </div>

        <div className="hero-mark" aria-hidden="true">
          <img src="/assets/donkey.png" alt="" />
          <span>DONKEY INDUSTRIAL / ARCHIVO DE CAMPO</span>
        </div>
      </section>

      <section
        className="contact-sheet"
        id="archivo"
        aria-labelledby="archivo-title"
        data-active={activeProject}
      >
        <h2 className="sr-only" id="archivo-title">Archivo de proyectos</h2>
        {projects.map((project, index) => {
          const isActive = activeProject === index;
          return (
            <article
              className={`project-frame ${isActive ? "is-active" : ""}`}
              key={project.code}
              tabIndex="0"
              role="button"
              aria-pressed={isActive}
              aria-label={`${project.title}. ${project.copy}`}
              onPointerEnter={() => setActiveProject(index)}
              onFocus={() => setActiveProject(index)}
              onClick={() => setActiveProject(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveProject(index);
                }
              }}
            >
              <img src={project.image} alt={project.alt} decoding="async" />
              <div className="project-overlay">
                <span>{project.code}</span>
                <h3>{project.title}</h3>
                <p>{project.copy}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="process-section" id="proceso" aria-labelledby="process-title">
        <aside className="process-index">
          <span>Antes de fabricar</span>
          <strong>03</strong>
          <p>Decisiones<br />concretas<br />menos riesgo</p>
        </aside>

        <div className="process-content">
          <h2 className="sr-only" id="process-title">Tres respuestas antes de fabricar</h2>

          <div className="process-list">
            {clientOutcomes.map((step, index) => {
              const isActive = activeStep === index;
              return (
                <button
                  className={`process-row ${isActive ? "is-active" : ""}`}
                  key={step.number}
                  type="button"
                  aria-expanded={isActive}
                  onClick={() => setActiveStep(index)}
                >
                  <span className="process-number">{step.number}</span>
                  <strong>{step.title}</strong>
                  <span className="process-copy">
                    {isActive ? step.detail : step.summary}
                  </span>
                  <ArrowRight
                    className="process-arrow"
                    size={22}
                    weight="bold"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="identity-section" id="marco" aria-labelledby="identity-title">
        <div className="identity-copy">
          <span className="section-code">MARCO / 04</span>
          <h2 id="identity-title">
            Marca y producto,
            <br />
            <em>el mismo lenguaje.</em>
          </h2>
          <p>
            Un marco visual y formal convierte cada lanzamiento en una extensión
            reconocible de la misma idea. Menos decisiones repetidas, más
            coherencia y una familia capaz de crecer.
          </p>

          <dl className="identity-values">
            <div>
              <dt>Reconocimiento</dt>
              <dd>Se identifica antes de leer el logotipo.</dd>
            </div>
            <div>
              <dt>Coherencia</dt>
              <dd>Forma, color, gráfica y documentación responden al mismo criterio.</dd>
            </div>
            <div>
              <dt>Escala</dt>
              <dd>Nuevas variantes parten de un sistema, no de cero.</dd>
            </div>
          </dl>
        </div>

        <div className="identity-proof" aria-label="Evidencias de marca y producto">
          <article className="identity-panel">
            <img
              src="/assets/identity.webp"
              alt="Sistema de identidad gráfica aplicado por DONKEY Industrial"
              decoding="async"
            />
            <div className="identity-caption">
              <span>01 / MARCA</span>
              <strong>Una voz propia</strong>
              <p>Hace visible la promesa y mejora el recuerdo.</p>
            </div>
          </article>

          <article className="identity-panel">
            <img
              src="/assets/render.webp"
              alt="Lenguaje formal aplicado al diseño de producto"
              decoding="async"
            />
            <div className="identity-caption">
              <span>02 / PRODUCTO</span>
              <strong>Una familia reconocible</strong>
              <p>Acelera decisiones y protege la coherencia al crecer.</p>
            </div>
          </article>
        </div>
      </section>
      <section className="contact-section" id="contacto" aria-labelledby="contact-title">
        <div className="contact-intro">
          <span className="section-code section-code-light">ENCARGO / 01</span>
          <h2 id="contact-title">¿Qué tiene que<br />funcionar?</h2>
          <p>
            Cuéntanos el contexto, las restricciones y en qué punto está la
            idea. La primera conversación sirve para ordenar el problema.
          </p>
          <a href="mailto:hola@donkeyindustrial.com">
            hola@donkeyindustrial.com
          </a>
        </div>

        <div className="contact-form-wrap">
          {submitted ? (
            <div className="success-state" role="status">
              <CheckCircle size={40} weight="fill" aria-hidden="true" />
              <span>RECIBIDO / REV. 01</span>
              <h3>El problema ya está sobre la mesa.</h3>
              <p>
                Este prototipo no envía datos. La experiencia final conectaría
                este paso con el canal de contacto elegido.
              </p>
              <button className="text-link text-link-light" type="button" onClick={() => setSubmitted(false)}>
                Volver al formulario
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label>
                Nombre
                <input name="name" autoComplete="name" required />
              </label>
              <label>
                Email
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                El problema
                <textarea
                  name="problem"
                  rows="4"
                  placeholder="Qué debe hacer, dónde se usa y qué está fallando ahora."
                  required
                />
              </label>
              <button className="button button-light" type="submit">
                Ponerlo sobre la mesa
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="site-footer">
        <strong>DONKEY Industrial</strong>
        <span>Granada / España</span>
        <a href="#inicio">Volver arriba</a>
      </footer>
    </main>
  );
}
