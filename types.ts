export interface PowerBiLabelData {
  ord_in_codigo: number; // ORDEM (OP)
  ord_dt_abertura_real: string; // Data da fabricação
  fil_in_codigo: number; // FILIAL
  pro_st_alternativo: string; // Produto
  pro_st_descricao: string; // Descrição
  orl_st_lotefabricacao: string; // LOTE
  esv_st_valor: string; // Composição
}

export interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
  scope: string;
}
