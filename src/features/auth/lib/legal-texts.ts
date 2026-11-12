/**
 * Texto dos documentos que o backend pede para aceitar (a API só informa tipo e versão).
 * Versão preliminar, a revisar com o jurídico antes do lançamento.
 */
export interface LegalText {
  title: string;
  sections: { heading: string; body: string }[];
}

export const LEGAL_TEXTS: Record<string, LegalText> = {
  TERMS_OF_USE: {
    title: "Termos de uso",
    sections: [
      {
        heading: "Para que serve o portal",
        body: "O Portal Pro Nutri permite que você cadastre pacientes, publique prescrições alimentares e acompanhe a semana que eles registram no app Prato em Dia.",
      },
      {
        heading: "Seu acesso",
        body: "O acesso é pessoal e intransferível. Você é responsável por manter sua senha em sigilo e por tudo o que for feito com a sua conta. Avise a equipe do Prato em Dia se suspeitar de uso indevido.",
      },
      {
        heading: "Sua responsabilidade profissional",
        body: "As prescrições e orientações publicadas por você são de sua responsabilidade profissional. O portal é uma ferramenta de apoio e não substitui o seu julgamento clínico nem as normas do seu conselho profissional.",
      },
      {
        heading: "Pacientes vinculados",
        body: "Você só deve cadastrar e acompanhar pacientes com quem mantém uma relação de cuidado e que concordaram em ser acompanhados por você. Ao encerrar o vínculo, você deixa de ter acesso aos dados do paciente.",
      },
      {
        heading: "Uso adequado",
        body: "Não use o portal para fins que não sejam o acompanhamento nutricional dos seus pacientes, nem tente acessar dados de quem não está vinculado a você.",
      },
    ],
  },
  PRIVACY_POLICY: {
    title: "Política de privacidade",
    sections: [
      {
        heading: "Quais dados tratamos",
        body: "Tratamos os seus dados de cadastro (nome, e-mail e registro profissional) e, em nome dos seus pacientes, nome, e-mail, prescrições e os registros de refeições feitos no app.",
      },
      {
        heading: "Para que usamos",
        body: "Usamos esses dados para autenticar você, permitir que publique prescrições e acompanhe a semana de cada paciente, e para manter o serviço seguro e funcionando.",
      },
      {
        heading: "Dados de saúde",
        body: "Informações alimentares e de acompanhamento podem ser dados pessoais sensíveis. Elas são acessíveis só a você e ao próprio paciente, enquanto o vínculo estiver ativo, e não são compartilhadas com terceiros para outras finalidades.",
      },
      {
        heading: "Por quanto tempo guardamos",
        body: "Mantemos os dados enquanto a conta estiver ativa e pelo prazo exigido por lei. Ao encerrar um vínculo, você deixa de ver os dados do paciente.",
      },
      {
        heading: "Seus direitos",
        body: "Você pode pedir acesso, correção ou exclusão dos seus dados, conforme a Lei Geral de Proteção de Dados (LGPD). Para isso, fale com a equipe do Prato em Dia pelos canais de suporte do aplicativo.",
      },
    ],
  },
};
