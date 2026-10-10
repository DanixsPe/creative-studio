"use client";

import Link from "next/link";

const Updated = "10 de octubre de 2026";
const Responsible = "[COMPLETAR: nombre legal o razón social del responsable]";
const Contact = "[COMPLETAR: correo de privacidad y soporte]";
const Address = "[COMPLETAR: dirección física para notificaciones]";
const IdNumber = "[COMPLETAR: identificación o NIT, según corresponda]";

const sections = [
  ["resumen", "Resumen y estado del documento"],
  ["privacidad", "Política de tratamiento de datos personales"],
  ["derechos", "Derechos y solicitudes de privacidad"],
  ["terminos", "Términos y condiciones de uso"],
  ["ia", "Uso de inteligencia artificial y contenido"],
  ["cookies", "Cookies, sesión y disponibilidad"],
  ["propiedad", "Contenido, propiedad intelectual y referencias"],
  ["seguridad", "Seguridad, conservación y eliminación"],
  ["contacto", "Responsable y contacto"]
];

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-8 text-xl font-semibold tracking-tight text-white sm:text-2xl">{children}</h2>;
}

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.14),_transparent_42%)]" />
      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-xl outline-none focus:ring-2 focus:ring-violet-400">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white font-black text-black">C</span>
          <span><span className="block text-sm font-semibold">Creative Studio</span><span className="block text-xs text-white/40">Centro legal y privacidad</span></span>
        </Link>
        <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 transition hover:border-white/25 hover:text-white">Volver a la aplicación</Link>
      </header>

      <section className="relative mx-auto grid w-full max-w-7xl gap-8 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 lg:sticky lg:top-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/65">Documentación</div>
          <nav className="mt-4 space-y-1.5">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-2 text-sm text-white/55 transition hover:bg-white/[0.05] hover:text-white">{label}</a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 space-y-8">
          <div className="rounded-3xl border border-amber-200/15 bg-amber-200/[0.04] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-200/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100/80">Borrador previo al lanzamiento</span>
              <span className="text-xs text-white/35">Actualizado: {Updated}</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Legal, privacidad y uso responsable</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">Esta página reúne borradores para el uso de Creative Studio en Colombia. Antes de publicar el servicio para terceros, completa los campos entre corchetes y revisa el texto con un profesional jurídico colombiano que conozca el modelo de negocio, los proveedores de IA y los flujos reales de datos.</p>
            <p className="mt-3 text-sm leading-6 text-amber-100/75">No publiques esta versión como definitiva: todavía faltan la identificación legal del responsable, los canales reales para ejercer derechos, las reglas comerciales finales y una validación jurídica.</p>
          </div>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f13]/80 p-5 sm:p-7">
            <SectionTitle id="resumen">Resumen y estado del documento</SectionTitle>
            <div className="mt-4 space-y-3 text-sm leading-6 text-white/65">
              <p>Creative Studio es un espacio creativo asistido por inteligencia artificial que permite organizar marcas, cargar recursos y referencias, generar conceptos, textos e imágenes, y conservar un historial asociado a cada cuenta.</p>
              <p>Este documento está escrito para el funcionamiento actual en fase de prueba. No implica que exista una sociedad constituida, que se ofrezcan suscripciones pagas, que se haya implementado una herramienta de analítica ni que se garantice disponibilidad permanente.</p>
              <p>Marco normativo de referencia para Colombia: Ley 1581 de 2012 y su reglamentación para datos personales; Ley 1480 de 2011 y sus modificaciones en caso de ofrecer el servicio como una relación de consumo; y las demás normas que resulten aplicables según el modelo comercial real.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f13]/80 p-5 sm:p-7">
            <SectionTitle id="privacidad">Política de tratamiento de datos personales</SectionTitle>
            <div className="mt-4 space-y-4 text-sm leading-6 text-white/65">
              <p><strong className="text-white">Responsable del tratamiento:</strong> {Responsible}. <strong className="text-white">Identificación:</strong> {IdNumber}. <strong className="text-white">Dirección de notificación:</strong> {Address}. <strong className="text-white">Correo:</strong> {Contact}.</p>
              <h3 className="font-semibold text-white">Datos que podemos tratar</h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>Datos de cuenta e inicio de sesión: correo electrónico, nombre e imagen de perfil que autorices a compartir mediante Google.</li>
                <li>Datos de uso: marcas creadas, prompts, proyectos, resultados, historial, preferencias y registros técnicos necesarios para operar y proteger el servicio.</li>
                <li>Contenido que cargas: imágenes, logos, fotografías de productos, referencias, documentos y otros recursos que decidas guardar.</li>
                <li>Datos técnicos básicos que registren los proveedores de alojamiento, autenticación, almacenamiento y generación de IA para prestar y proteger sus servicios.</li>
              </ul>
              <h3 className="font-semibold text-white">Finalidades</h3>
              <p>Usamos estos datos para crear y administrar la cuenta; guardar marcas, recursos e historial; prestar funciones de generación; adaptar los resultados a las referencias proporcionadas; atender solicitudes; resolver errores, prevenir abusos, mantener la seguridad y cumplir obligaciones legales aplicables.</p>
              <h3 className="font-semibold text-white">Proveedores y tratamiento internacional</h3>
              <p>El funcionamiento actual integra proveedores tecnológicos que pueden procesar datos desde otros países, incluidos Google (inicio de sesión y modelos Gemini), Cloudflare (generación de imágenes), Supabase (autenticación, base de datos y almacenamiento) y Vercel (alojamiento y despliegue). Los prompts se envían al proveedor de texto; las referencias visuales seleccionadas y prompts para imágenes pueden enviarse a los proveedores de IA correspondientes. El responsable deberá confirmar y documentar los acuerdos, regiones, condiciones de retención y mecanismos de transmisión o transferencia que correspondan antes del lanzamiento público.</p>
              <h3 className="font-semibold text-white">Base, autorización y minimización</h3>
              <p>Solicitaremos autorización previa, expresa e informada cuando sea requerida, informando las finalidades y conservando evidencia de la autorización. No cargues datos sensibles, información de menores, secretos empresariales ni imágenes de terceros sin contar con las autorizaciones o derechos necesarios. No pedimos datos sensibles para las funciones descritas.</p>
              <h3 className="font-semibold text-white">Conservación</h3>
              <p>Conservamos datos mientras sean necesarios para prestar el servicio, mantener tu historial, resolver reclamaciones, proteger la plataforma o cumplir obligaciones legales. Antes del lanzamiento se debe completar un calendario concreto de conservación y eliminación para cuentas inactivas, copias de seguridad, registros técnicos y datos mantenidos por proveedores externos.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f13]/80 p-5 sm:p-7">
            <SectionTitle id="derechos">Derechos y solicitudes de privacidad</SectionTitle>
            <div className="mt-4 space-y-3 text-sm leading-6 text-white/65">
              <p>Según la normativa colombiana aplicable, puedes solicitar acceso a tus datos personales, conocer su tratamiento, corregirlos o actualizarlos, pedir prueba de la autorización, solicitar información sobre su uso, presentar consultas o reclamos, y pedir supresión o revocatoria cuando legalmente proceda.</p>
              <p>Envía la solicitud a <strong className="text-white">{Contact}</strong> e incluye tu nombre, el correo de la cuenta, el derecho que deseas ejercer y los detalles necesarios para localizar la información. El responsable verificará tu identidad y responderá dentro de los términos legales que correspondan. Si procede, también puedes acudir a la Superintendencia de Industria y Comercio (SIC), una vez cumplido el trámite directo exigido por la ley.</p>
              <p>El canal anterior es un marcador pendiente: no debe usarse públicamente hasta que se configure y se pruebe una dirección que realmente sea atendida.</p>
              <a className="inline-flex text-violet-200 underline decoration-violet-200/30 underline-offset-4 hover:text-violet-100" href="https://www.sic.gov.co/tema/proteccion-de-datos-personales" target="_blank" rel="noreferrer">Información oficial de la SIC sobre datos personales</a>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f13]/80 p-5 sm:p-7">
            <SectionTitle id="terminos">Términos y condiciones de uso</SectionTitle>
            <div className="mt-4 space-y-4 text-sm leading-6 text-white/65">
              <p>Al crear una cuenta o utilizar Creative Studio, aceptas estas condiciones y las versiones que se indiquen en el momento de su aceptación. Si no estás de acuerdo, no utilices el servicio.</p>
              <h3 className="font-semibold text-white">Cuenta y acceso</h3>
              <p>Debes proporcionar datos veraces, proteger las credenciales de acceso y utilizar únicamente cuentas que estés autorizado a controlar. Eres responsable de la actividad realizada desde tu cuenta y debes avisar al responsable si sospechas de acceso no autorizado.</p>
              <h3 className="font-semibold text-white">Uso permitido</h3>
              <p>No puedes usar la plataforma para infringir leyes, vulnerar derechos de terceros, suplantar personas, crear publicidad engañosa, distribuir contenido ilegal, intentar acceder a cuentas o recursos ajenos, interferir con la seguridad o evadir límites técnicos del servicio.</p>
              <h3 className="font-semibold text-white">Disponibilidad y cambios</h3>
              <p>La plataforma se encuentra en desarrollo. Podemos modificar, pausar o retirar funciones para mantenimiento, seguridad o cambios en proveedores. No garantizamos disponibilidad continua ni que un resultado sea producido siempre a la primera. Cuando existan condiciones comerciales, precios, límites, cancelaciones o reembolsos, deberán informarse de manera clara antes de contratar y documentarse en una versión revisada de estos términos.</p>
              <h3 className="font-semibold text-white">Sin servicios pagos configurados en este borrador</h3>
              <p>Esta versión no fija precios, renovaciones, métodos de pago ni compromisos de suscripción. Si se habilitan cobros al público, se añadirán las condiciones aplicables, información de identidad y contacto del proveedor, precio total, soporte, cancelación, retracto y demás derechos de consumidores cuando correspondan.</p>
              <h3 className="font-semibold text-white">Limitaciones razonables</h3>
              <p>En la medida permitida por la ley, Creative Studio se ofrece en su estado actual de desarrollo y no sustituye la revisión profesional de las piezas antes de publicarlas. Nada en estos términos elimina derechos irrenunciables del consumidor ni responsabilidades que legalmente no puedan limitarse.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f13]/80 p-5 sm:p-7">
            <SectionTitle id="ia">Uso de inteligencia artificial y contenido</SectionTitle>
            <div className="mt-4 space-y-3 text-sm leading-6 text-white/65">
              <p>Las piezas, copys, prompts y propuestas visuales se producen mediante modelos de terceros. Los modelos pueden generar errores, artefactos, texto incorrecto, objetos deformados, similitudes inesperadas u otros resultados no deseados. Debes revisar, editar y aprobar cada resultado antes de publicar, imprimir, vender o invertir en una campaña.</p>
              <p>No garantizamos exclusividad, originalidad jurídica, exactitud de afirmaciones, cumplimiento de políticas de plataformas publicitarias ni disponibilidad de derechos sobre elementos producidos por modelos externos. Verifica marcas, logotipos, rostros, productos, licencias, afirmaciones comerciales y derechos de imagen.</p>
              <p>Los resultados pueden ser similares a contenidos producidos para otras personas. No cargues una imagen como referencia a menos que tengas permiso para usarla y para permitir su procesamiento por los proveedores tecnológicos. No solicites imitación engañosa de personas reales ni usos que infrinjan derechos.</p>
              <p>El análisis de referencias genera una guía de estilo para orientar prompts futuros; no significa que se reentrenen automáticamente los pesos del modelo. Las limitaciones y límites de uso de los proveedores externos también se aplican.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f13]/80 p-5 sm:p-7">
            <SectionTitle id="cookies">Cookies, sesión y disponibilidad</SectionTitle>
            <div className="mt-4 space-y-3 text-sm leading-6 text-white/65">
              <p>La aplicación utiliza almacenamiento técnico y cookies de sesión necesarios para autenticarte, mantener la sesión y completar el inicio de sesión con Google. El navegador también puede exponer un estado de conexión online/offline para mostrar si puede alcanzar la aplicación.</p>
              <p>Los proveedores de alojamiento, autenticación y seguridad pueden procesar registros técnicos conforme a sus propias políticas. Antes del lanzamiento público se debe auditar la página desplegada y las dependencias para confirmar si existen cookies analíticas, publicidad, métricas o tecnologías no esenciales y, cuando proceda, informar su finalidad y obtener el consentimiento correspondiente antes de activarlas.</p>
              <p>Puedes controlar o eliminar cookies desde la configuración de tu navegador; al bloquear las cookies necesarias, el inicio de sesión puede dejar de funcionar.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f13]/80 p-5 sm:p-7">
            <SectionTitle id="propiedad">Contenido, propiedad intelectual y referencias</SectionTitle>
            <div className="mt-4 space-y-3 text-sm leading-6 text-white/65">
              <p>Conservas los derechos que ya tengas sobre los textos, fotografías, logos, imágenes, marcas y demás materiales que subas. Al utilizar la plataforma, autorizas su almacenamiento y el procesamiento necesario para prestarte las funciones solicitadas, incluidos los envíos a los proveedores de IA descritos anteriormente.</p>
              <p>Declaras que tienes derechos, licencias o autorizaciones suficientes para subir esos materiales y solicitar su procesamiento. No debes cargar materiales confidenciales de clientes, personas identificables u otras marcas cuando exista una obligación de reserva o no tengas autorización.</p>
              <p>La titularidad, protección y posibilidad de uso comercial de resultados generados por IA puede depender de la ley, los términos del proveedor y las circunstancias de cada resultado. Revisa licencias y derechos de terceros antes de publicar.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f13]/80 p-5 sm:p-7">
            <SectionTitle id="seguridad">Seguridad, conservación y eliminación</SectionTitle>
            <div className="mt-4 space-y-3 text-sm leading-6 text-white/65">
              <p>Aplicamos medidas técnicas de control de acceso y almacenamiento por cuenta. Ningún servicio conectado a Internet puede prometer seguridad absoluta; mantén tus credenciales protegidas y evita subir información que no sea necesaria.</p>
              <p>Puedes solicitar la eliminación de tu cuenta y contenido mediante el canal de privacidad indicado en esta página. La eliminación completa debe contemplar bases de datos, archivos, historial, respaldos y proveedores externos, en los plazos y límites legales aplicables. El responsable debe definir e implementar un procedimiento de borrado antes de abrir el servicio al público; por ahora, el correo de contacto es un dato pendiente.</p>
              <p>Los incidentes de seguridad se gestionarán según su naturaleza, los riesgos y los deberes legales aplicables, incluyendo las notificaciones que procedan.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f13]/80 p-5 sm:p-7">
            <SectionTitle id="contacto">Responsable y contacto</SectionTitle>
            <div className="mt-4 space-y-2 text-sm leading-6 text-white/65">
              <p><strong className="text-white">Responsable:</strong> {Responsible}</p>
              <p><strong className="text-white">Identificación/NIT:</strong> {IdNumber}</p>
              <p><strong className="text-white">Dirección:</strong> {Address}</p>
              <p><strong className="text-white">Correo de privacidad y soporte:</strong> {Contact}</p>
              <p><strong className="text-white">Versión:</strong> 0.1 — borrador, {Updated}.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-violet-200/10 bg-violet-200/[0.035] p-5 sm:p-7">
            <h2 className="text-lg font-semibold">Fuentes oficiales de referencia</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/65">
              <li><a className="underline decoration-white/20 underline-offset-4 hover:text-white" href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981" target="_blank" rel="noreferrer">Ley 1581 de 2012 — Protección de datos personales</a></li>
              <li><a className="underline decoration-white/20 underline-offset-4 hover:text-white" href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646" target="_blank" rel="noreferrer">Decreto 1377 de 2013 — reglamentación de protección de datos</a></li>
              <li><a className="underline decoration-white/20 underline-offset-4 hover:text-white" href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306" target="_blank" rel="noreferrer">Ley 1480 de 2011 — Estatuto del Consumidor</a></li>
              <li><a className="underline decoration-white/20 underline-offset-4 hover:text-white" href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=257116" target="_blank" rel="noreferrer">Ley 2439 de 2024 — modificaciones sobre comercio electrónico</a></li>
            </ul>
          </section>

          <footer className="pb-8 text-center text-xs text-white/30">Creative Studio · Documentación preliminar · {Updated}</footer>
        </article>
      </section>
    </main>
  );
}
