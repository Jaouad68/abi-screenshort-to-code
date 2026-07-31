import type { Company, Client, Devis, DevisLigne } from "@/generated/prisma/client";
import { calculerTotaux, montantLigneHtCents, calculerAcompte } from "@/lib/calcul";
import { formatCents, formatQuantite } from "@/lib/money";
import { formatDate, ajouterJours } from "@/lib/date";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Rendu HTML d'un devis pour un email (styles inline, compatible messageries). */
export function devisEnHtml(
  company: Company,
  client: Client,
  devis: Devis & { lignes: DevisLigne[] },
): string {
  const totaux = calculerTotaux(devis.lignes);
  const echeance = ajouterJours(devis.dateDevis, devis.dureeValidite);
  const acompte =
    devis.acomptePct > 0 ? calculerAcompte(totaux.totalTtcCents, devis.acomptePct) : null;

  const lignesHtml = devis.lignes
    .map(
      (l) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">
          <strong>${esc(l.libelle)}</strong>${
            l.description ? `<br><span style="color:#64748b;font-size:12px">${esc(l.description)}</span>` : ""
          }
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${formatQuantite(l.quantiteMilli)} ${esc(l.unite)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${formatCents(l.prixUnitaireCents)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${l.tauxTva} %</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right"><strong>${formatCents(montantLigneHtCents(l))}</strong></td>
      </tr>`,
    )
    .join("");

  const tvaHtml = totaux.ventilationTva
    .map(
      (v) =>
        `<tr><td style="color:#64748b">TVA ${v.taux} %</td><td style="text-align:right">${formatCents(v.montantTvaCents)}</td></tr>`,
    )
    .join("");

  const acompteHtml = acompte
    ? `<tr><td style="color:#64748b">Acompte à la commande (${devis.acomptePct} %)</td><td style="text-align:right">${formatCents(acompte.acompteCents)}</td></tr>
       <tr><td style="color:#64748b">Solde à la livraison</td><td style="text-align:right">${formatCents(acompte.soldeCents)}</td></tr>`
    : "";

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
    <div style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:16px">
      <div style="font-size:18px;font-weight:bold">${esc(company.nom)}</div>
      <div style="color:#64748b;font-size:13px">
        ${esc(company.adresse)} ${esc(company.codePostal)} ${esc(company.ville)}<br>
        ${company.telephone ? "Tél. " + esc(company.telephone) + " · " : ""}${esc(company.email)}
      </div>
    </div>

    <h2 style="margin:0 0 4px">Devis ${esc(devis.numero)}</h2>
    <p style="color:#64748b;margin:0 0 16px">
      Date : ${formatDate(devis.dateDevis)} — Valable jusqu'au ${formatDate(echeance)}
    </p>

    <p>Bonjour,</p>
    <p>Veuillez trouver ci-dessous notre devis${devis.objet ? ` concernant : <strong>${esc(devis.objet)}</strong>` : ""}.</p>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0">
      <thead>
        <tr style="background:#1d4ed8;color:#fff">
          <th style="padding:8px;text-align:left">Désignation</th>
          <th style="padding:8px;text-align:right">Qté</th>
          <th style="padding:8px;text-align:right">P.U. HT</th>
          <th style="padding:8px;text-align:right">TVA</th>
          <th style="padding:8px;text-align:right">Total HT</th>
        </tr>
      </thead>
      <tbody>${lignesHtml}</tbody>
    </table>

    <table style="width:100%;max-width:300px;margin-left:auto;font-size:13px">
      <tr><td style="color:#64748b">Total HT</td><td style="text-align:right">${formatCents(totaux.totalHtCents)}</td></tr>
      ${tvaHtml}
      <tr><td style="font-weight:bold;border-top:2px solid #0f172a;padding-top:6px">Total TTC</td><td style="text-align:right;font-weight:bold;border-top:2px solid #0f172a;padding-top:6px">${formatCents(totaux.totalTtcCents)}</td></tr>
      ${acompteHtml}
    </table>

    ${devis.conditions ? `<p style="color:#64748b;font-size:12px;margin-top:16px">${esc(devis.conditions)}</p>` : ""}
    ${company.mentionsLegales ? `<p style="color:#64748b;font-size:11px">${esc(company.mentionsLegales)}</p>` : ""}

    <p style="margin-top:16px">Pour toute question, n'hésitez pas à nous contacter.</p>
    <p>Cordialement,<br>${esc(company.nom)}</p>
  </div>`;
}
