"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FormPasto from "@/components/lotes/FormPasto";
import FormConfinamento from "@/components/lotes/FormConfinamento";
import FormSemi from "@/components/lotes/FormSemi";
import FormCria from "@/components/lotes/FormCria";
import FormRecria from "@/components/lotes/FormRecria";

export default function LotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">Lotes</h1>
        <p className="text-sm text-t-secondary mt-1">
          Calcule custo, margem, ROI e protecao para cada sistema produtivo
        </p>
      </div>

      <Tabs defaultValue={0}>
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value={0}>Terminacao pasto</TabsTrigger>
          <TabsTrigger value={1}>Confinamento</TabsTrigger>
          <TabsTrigger value={2}>Semiconfinamento</TabsTrigger>
          <TabsTrigger value={3}>Cria</TabsTrigger>
          <TabsTrigger value={4}>Recria</TabsTrigger>
        </TabsList>

        <TabsContent value={0}><FormPasto /></TabsContent>
        <TabsContent value={1}><FormConfinamento /></TabsContent>
        <TabsContent value={2}><FormSemi /></TabsContent>
        <TabsContent value={3}><FormCria /></TabsContent>
        <TabsContent value={4}><FormRecria /></TabsContent>
      </Tabs>
    </div>
  );
}
