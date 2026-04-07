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

      <Tabs defaultValue="pasto">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="pasto">Terminacao pasto</TabsTrigger>
          <TabsTrigger value="confinamento">Confinamento</TabsTrigger>
          <TabsTrigger value="semi">Semiconfinamento</TabsTrigger>
          <TabsTrigger value="cria">Cria</TabsTrigger>
          <TabsTrigger value="recria">Recria</TabsTrigger>
        </TabsList>

        <TabsContent value="pasto">
          <FormPasto />
        </TabsContent>
        <TabsContent value="confinamento">
          <FormConfinamento />
        </TabsContent>
        <TabsContent value="semi">
          <FormSemi />
        </TabsContent>
        <TabsContent value="cria">
          <FormCria />
        </TabsContent>
        <TabsContent value="recria">
          <FormRecria />
        </TabsContent>
      </Tabs>
    </div>
  );
}
