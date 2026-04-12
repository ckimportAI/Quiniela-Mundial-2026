"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PaymentWithUser {
  id: string;
  credits: number;
  amount: string;
  method: string;
  reference: string;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string | null;
    nickname: string | null;
    email: string;
  };
}

export default function AdminPagosPage() {
  const [payments, setPayments] = useState<PaymentWithUser[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("PENDING");
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>(
    {}
  );
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter
        ? `/api/admin/payments?status=${filter}`
        : "/api/admin/payments";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setPendingCount(data.pendingCount);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleReview = async (
    paymentId: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    setProcessing(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          rejectionNote:
            status === "REJECTED" ? rejectionNotes[paymentId] : undefined,
        }),
      });

      if (res.ok) {
        fetchPayments();
      } else {
        const data = await res.json();
        alert(data.error ?? "Error al procesar");
      }
    } finally {
      setProcessing(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-300"
          >
            Pendiente
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300"
          >
            Aprobado
          </Badge>
        );
      case "REJECTED":
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion de Pagos</h1>
        <p className="text-muted-foreground">
          Revisa y aprueba los reportes de pago de los participantes.
          {pendingCount > 0 && (
            <Badge className="ml-2" variant="secondary">
              {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: "PENDING", label: "Pendientes" },
          { value: "APPROVED", label: "Aprobados" },
          { value: "REJECTED", label: "Rechazados" },
          { value: "", label: "Todos" },
        ].map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Payments table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No hay pagos {filter === "PENDING" ? "pendientes" : ""}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Creditos</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {p.user.nickname ?? p.user.name ?? "Sin nombre"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {p.credits}
                    </TableCell>
                    <TableCell>${p.amount}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>
                      <span className="text-xs font-mono">{p.reference}</span>
                      {p.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(p.createdAt).toLocaleString("es")}
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-right">
                      {p.status === "PENDING" ? (
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={processing === p.id}
                              onClick={() => handleReview(p.id, "APPROVED")}
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={processing === p.id}
                              onClick={() => handleReview(p.id, "REJECTED")}
                            >
                              Rechazar
                            </Button>
                          </div>
                          <Input
                            placeholder="Motivo de rechazo (opcional)"
                            className="w-48 text-xs"
                            value={rejectionNotes[p.id] ?? ""}
                            onChange={(e) =>
                              setRejectionNotes((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      ) : p.rejectionNote ? (
                        <span className="text-xs text-destructive">
                          {p.rejectionNote}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Revisado
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
