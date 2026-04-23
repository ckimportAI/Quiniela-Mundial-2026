import { TERMS_LAST_UPDATE, CONTACT_EMAIL } from "@/lib/constants";

export const metadata = {
  title: "Politica de Privacidad | QuinielaPanas",
};

export default function PrivacidadPage() {
  return (
    <article className="mx-auto max-w-3xl prose prose-sm sm:prose-base">
      <h1 className="text-3xl font-bold">Politica de Privacidad - QuinielaPanas</h1>
      <p className="text-muted-foreground">
        <strong>Ultima actualizacion:</strong> {TERMS_LAST_UPDATE}
      </p>

      <h2 className="text-xl font-semibold mt-8">1. Datos que Recopilamos</h2>
      <p>Al registrarte, recopilamos:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Nombre completo</li>
        <li>Cedula de identidad</li>
        <li>Numero de telefono (WhatsApp)</li>
        <li>Direccion de email</li>
        <li>Pseudonimo (nickname)</li>
        <li>IP de conexion</li>
        <li>Datos de uso (predicciones, quinielas, etc.)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">2. Como Usamos tus Datos</h2>
      <p>Usamos tus datos para:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Operar el servicio (tu cuenta, predicciones, premios)</li>
        <li>Comunicacion esencial (notificaciones de partidos, confirmaciones de pago, resultados)</li>
        <li>Validar pagos y prevenir fraude</li>
        <li>Mejorar el servicio</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">3. Lo Que NO Hacemos</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>NO vendemos tus datos a terceros</li>
        <li>NO enviamos spam comercial</li>
        <li>NO compartimos tu informacion sin consentimiento</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">4. Seguridad</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Autenticacion segura (OAuth de Google, JWT)</li>
        <li>HTTPS en toda la plataforma</li>
        <li>Base de datos con acceso restringido</li>
        <li>Backups diarios seguros</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">5. Tus Derechos</h2>
      <p>Puedes:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Acceder a tus datos</li>
        <li>Corregir informacion erronea</li>
        <li>Solicitar eliminacion de tu cuenta</li>
        <li>Descargar tus datos</li>
      </ul>
      <p>
        Para ejercer estos derechos: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>
      </p>

      <h2 className="text-xl font-semibold mt-8">6. Cookies</h2>
      <p>Usamos cookies tecnicas necesarias para:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Mantener tu sesion iniciada</li>
        <li>Recordar tus preferencias</li>
        <li>Analitica anonima</li>
      </ul>
      <p>No usamos cookies de publicidad de terceros.</p>

      <h2 className="text-xl font-semibold mt-8">7. Menores de Edad</h2>
      <p>
        QuinielaPanas es solo para mayores de 18 anos. No recopilamos conscientemente datos de menores.
      </p>

      <h2 className="text-xl font-semibold mt-8">8. Cambios en esta Politica</h2>
      <p>Te notificaremos con 7 dias de anticipacion sobre cambios importantes.</p>

      <h2 className="text-xl font-semibold mt-8">9. Contacto</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a></li>
      </ul>
    </article>
  );
}
