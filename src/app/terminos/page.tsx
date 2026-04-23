import { TERMS_VERSION, TERMS_LAST_UPDATE, CONTACT_EMAIL, ENTRY_FEE_USD } from "@/lib/constants";

export const metadata = {
  title: "Terminos y Condiciones | QuinielaPanas",
};

export default function TerminosPage() {
  return (
    <article className="mx-auto max-w-3xl prose prose-sm sm:prose-base">
      <h1 className="text-3xl font-bold">Terminos y Condiciones - QuinielaPanas</h1>
      <p className="text-muted-foreground">
        <strong>Ultima actualizacion:</strong> {TERMS_LAST_UPDATE}
        <br />
        <strong>Version:</strong> {TERMS_VERSION}
      </p>

      <h2 className="text-xl font-semibold mt-8">1. Aceptacion de los Terminos</h2>
      <p>
        Al registrarte en QuinielaPanas.com (en adelante &quot;la Plataforma&quot;), aceptas estos Terminos y Condiciones en su totalidad. Si no estas de acuerdo, no debes utilizar la Plataforma.
      </p>
      <p>La Plataforma es operada desde Caracas, Venezuela.</p>

      <h2 className="text-xl font-semibold mt-8">2. Naturaleza del Servicio</h2>
      <p>
        QuinielaPanas es una plataforma digital de <strong>prediccion deportiva</strong> basada en la <strong>habilidad</strong> del participante para pronosticar resultados de partidos del Mundial FIFA 2026.
      </p>
      <p>
        <strong>IMPORTANTE:</strong> Este servicio NO constituye un juego de azar, apuesta deportiva, ni casa de apuestas. Es un concurso de prediccion basado en conocimiento y habilidad.
      </p>

      <h2 className="text-xl font-semibold mt-8">3. Requisitos de Participacion</h2>
      <p>Para participar debes:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Ser mayor de 18 anos</li>
        <li>Residir en Venezuela o tener WhatsApp venezolano activo</li>
        <li>Proporcionar informacion verdadera al registrarte</li>
        <li>Tener UNA sola cuenta por persona</li>
        <li>Aceptar estos terminos</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">4. Cuentas y Registro</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Cada persona puede tener UNA sola cuenta</li>
        <li>Las cuentas duplicadas seran eliminadas sin derecho a reembolso</li>
        <li>Eres responsable de mantener segura tu contrasena</li>
        <li>La Plataforma puede cerrar cuentas con informacion falsa</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">5. Participacion y Quinielas</h2>
      <h3 className="text-lg font-semibold mt-4">5.1 Creacion de Quinielas</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Un usuario puede tener multiples quinielas</li>
        <li>Cada quiniela adicional requiere pago de entrada</li>
        <li>Las quinielas son independientes entre si</li>
      </ul>
      <h3 className="text-lg font-semibold mt-4">5.2 Entrada y Pago</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Costo por quiniela: ${ENTRY_FEE_USD} USD (o equivalente en Bs.)</li>
        <li>Metodos de pago: Pago Movil, Zelle, Binance Pay</li>
        <li>El pago debe confirmarse con comprobante</li>
        <li>Una vez confirmado, la quiniela queda activa</li>
      </ul>
      <h3 className="text-lg font-semibold mt-4">5.3 NO se aceptan devoluciones</h3>
      <p>Una vez confirmado el pago y creada la quiniela, no hay devoluciones bajo ninguna circunstancia.</p>

      <h2 className="text-xl font-semibold mt-8">6. Sistema de Puntuacion</h2>
      <h3 className="text-lg font-semibold mt-4">6.1 Puntos Base por Partido</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Resultado exacto: 5 puntos</li>
        <li>Ganador correcto: 3 puntos</li>
        <li>Un marcador correcto: 1 punto</li>
        <li>Prediccion errada: 0 puntos</li>
      </ul>
      <h3 className="text-lg font-semibold mt-4">6.2 Multiplicadores por Fase</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Fase de Grupos: x1</li>
        <li>Ronda de 32: x1.5</li>
        <li>Octavos de Final: x1.5</li>
        <li>Cuartos de Final: x2</li>
        <li>Semifinales: x2.5</li>
        <li>Tercer Lugar: x2</li>
        <li>Final: x3</li>
      </ul>
      <h3 className="text-lg font-semibold mt-4">6.3 Comodines</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Cada quiniela tiene 2 comodines</li>
        <li>Duplican (x2) los puntos del partido elegido</li>
        <li>Deben activarse ANTES del partido</li>
        <li>Una vez usados, no se recuperan</li>
      </ul>
      <h3 className="text-lg font-semibold mt-4">6.4 Predicciones de Torneo</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Campeon: 20 puntos</li>
        <li>Subcampeon: 10 puntos</li>
        <li>Tercer Lugar: 5 puntos</li>
        <li>Goleador del Mundial: 10 puntos</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">7. Deadlines y Bloqueos</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Las predicciones se bloquean 5 minutos antes del inicio oficial de cada partido</li>
        <li>Los comodines deben activarse antes del bloqueo</li>
        <li>La Plataforma usa la hora oficial FIFA para cada partido</li>
        <li>No se aceptan predicciones tardias bajo ninguna excusa</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">8. Resultados Oficiales</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Los resultados oficiales son los anunciados por FIFA</li>
        <li>En caso de partidos a penales, el resultado del tiempo reglamentario (90 minutos) es el que cuenta para las predicciones</li>
        <li>La Plataforma publicara resultados en las 24 horas siguientes a cada partido</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">9. Premios y Distribucion</h2>
      <h3 className="text-lg font-semibold mt-4">9.1 Pool de Premios</h3>
      <p>El pool de premios se forma con el 70% de todas las quinielas pagadas.</p>
      <p>Distribucion:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Primer lugar: 55% del pool</li>
        <li>Segundo lugar: 28% del pool</li>
        <li>Tercer lugar: 17% del pool</li>
      </ul>
      <h3 className="text-lg font-semibold mt-4">9.2 Entrega de Premios</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Los premios se pagan en los 7 dias siguientes a la final del Mundial</li>
        <li>Se paga por Pago Movil, Zelle o Binance Pay</li>
        <li>El ganador debe proporcionar datos validos para recibir</li>
        <li>Los premios no pagados por datos erroneos del ganador quedan a disposicion de la Plataforma</li>
      </ul>
      <h3 className="text-lg font-semibold mt-4">9.3 Impuestos</h3>
      <p>El ganador es responsable de cualquier impuesto aplicable en su jurisdiccion.</p>

      <h2 className="text-xl font-semibold mt-8">10. Grupos Privados</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Los usuarios pueden crear grupos privados</li>
        <li>Los premios entre miembros de grupos privados son acuerdo privado entre ellos</li>
        <li>QuinielaPanas NO administra, gestiona ni garantiza los premios de grupos privados</li>
        <li>QuinielaPanas NO es responsable de disputas en grupos privados</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">11. Conducta del Usuario</h2>
      <h3 className="text-lg font-semibold mt-4">11.1 Prohibido</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Crear multiples cuentas</li>
        <li>Compartir cuentas con terceros</li>
        <li>Usar bots o scripts automatizados</li>
        <li>Hackear, alterar o manipular la Plataforma</li>
        <li>Amenazar, insultar o acosar a otros usuarios</li>
        <li>Fraude en pagos o comprobantes falsos</li>
      </ul>
      <h3 className="text-lg font-semibold mt-4">11.2 Consecuencias</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Primera falta: advertencia</li>
        <li>Falta grave: eliminacion de cuenta sin reembolso</li>
        <li>Fraude: reporte legal correspondiente</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">12. Propiedad Intelectual</h2>
      <p>
        Todo el contenido, diseno, codigo y marca de la Plataforma es propiedad exclusiva de QuinielaPanas. Esta prohibido copiar, reproducir o distribuir sin autorizacion escrita.
      </p>

      <h2 className="text-xl font-semibold mt-8">13. Limitacion de Responsabilidad</h2>
      <p>QuinielaPanas NO se hace responsable por:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Caidas del servicio por fuerza mayor (cortes de luz, internet, DDoS, etc.)</li>
        <li>Decisiones arbitrales de FIFA que modifiquen resultados</li>
        <li>Cancelacion o modificacion del Mundial por FIFA</li>
        <li>Problemas ajenos a la Plataforma (bancos, Pago Movil, etc.)</li>
        <li>Acuerdos o disputas entre usuarios en grupos privados</li>
      </ul>
      <p>
        En caso de cancelacion del Mundial por FIFA, se reembolsara proporcionalmente el dinero de las quinielas no jugadas, reteniendo el 10% por costos operativos.
      </p>

      <h2 className="text-xl font-semibold mt-8">14. Privacidad de Datos</h2>
      <p>
        Consulta nuestra <a href="/privacidad" className="text-primary underline">Politica de Privacidad</a> para detalles sobre el tratamiento de tus datos.
      </p>

      <h2 className="text-xl font-semibold mt-8">15. Modificaciones</h2>
      <p>
        QuinielaPanas se reserva el derecho de modificar estos Terminos con 7 dias de aviso. El uso continuado implica aceptacion de los nuevos terminos.
      </p>

      <h2 className="text-xl font-semibold mt-8">16. Jurisdiccion y Ley Aplicable</h2>
      <p>
        Estos terminos se rigen por las leyes de la Republica Bolivariana de Venezuela. Cualquier disputa sera resuelta en tribunales de Caracas, Venezuela.
      </p>

      <h2 className="text-xl font-semibold mt-8">17. Contacto</h2>
      <p>Para consultas, disputas o soporte:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a></li>
        <li>Respuesta en: 48 horas habiles</li>
      </ul>

      <hr className="my-8" />
      <p className="text-center text-muted-foreground">
        <strong>QuinielaPanas - Mundial 2026</strong>
        <br />
        <em>Hecho con amor en Venezuela</em>
      </p>
    </article>
  );
}
