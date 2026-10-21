// GERADO por scripts/gerar-catalogo-pops.mjs. Não editar à mão.
// Versão enxuta: só o conteúdo dos modelos. Os valores numéricos (temperaturas, tempos, concentrações, prazos) NÃO foram verificados.
import type { CatalogoDeModelosPop } from "../popModelos.ts";

export const CATALOGO_DE_MODELOS_POP: CatalogoDeModelosPop = {
 "versao": 1,
 "pops": [
  {
   "id": "comp-01",
   "ordem": 1,
   "titulo": "Lavagem e higienização de mãos",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Reduzir a carga microbiana das mãos.",
     "Promover a proteção e segurança ao cliente e aos profissionais.",
     "Padronizar as ações para higienização de mãos.",
     "Prevenir as infecções relacionadas com a assistência à saúde."
    ],
    "responsabilidades": [
     {
      "titulo": null,
      "itens": [
       "Todos os profissionais que trabalham na empresa {{empresa}}."
      ]
     }
    ],
    "materiais": [
     "Dispenser com Sabonete bactericida",
     "Porta-papel com toalha não reciclável",
     "Pia apropriada, identificada como destinada à higienização das mãos",
     "Recipiente para descarte de resíduos comuns com a tampa acionada por pedal",
     "Álcool em gel"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Retirar adornos (pulseiras, relógios e anéis).",
       "Abrir a torneira e ajustar a água para um volume adequado.",
       "Manter as mãos em uma altura mais baixa que os cotovelos.",
       "Umedecer as mãos e antebraços com água.",
       "Aplicar o sabonete em uma quantidade suficiente para cobrir as superfícies das mãos.",
       "Friccionar primeiro as palmas das mãos uma contra a outra.",
       "Esfregar a palma da mão direita contra o dorso da mão esquerda entrelaçando os dedos e vice-versa.",
       "Entrelaçar os dedos e friccionar os espaços interdigitais.",
       "Esfregar o dorso dos dedos de uma mão com a palma da mão oposta, segurando os dedos, com movimento vai-e-vem e vice-versa.",
       "Esfregar o polegar esquerdo com auxílio da palma da mão direita, utilizando-se de movimento circular e vice-versa.",
       "Friccionar as polpas digitais e unhas da mão direita contra a palma da mão esquerda, fazendo movimento circular e vice-versa.",
       "Enxaguar as mãos de modo que a água corra no sentido do punho para as pontas dos dedos.",
       "Secar as mãos com papel toalha, começando pela palma de uma das mãos, dorso da mão e por último punho. No caso de torneira com abertura manual, utilize o papel toalha para fechar.",
       "Descartar o papel toalha na lixeira para resíduos comuns.",
       "Finalizar aplicando álcool gel."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Não se esquecer de retirar anéis e alianças.",
     "Lavar as mãos a cada troca de tarefa.",
     "Utilizar a pia específica para lavagem de mãos.",
     {
      "texto": "Realizar higienização das mãos sempre que:",
      "subitens": [
       "estiver com as mãos visivelmente sujas;",
       "após contato com sangue e outros fluidos corporais;",
       "após o uso de luvas;",
       "ao iniciar e terminar o turno do trabalho;",
       "antes de manipulação e preparo de alimentos;",
       "sempre que tossir, espirrar, se coçar ou similares;",
       "depois de manipular recipientes de lixo."
      ]
     }
    ],
    "verificacao": [
     "O responsável pelo setor deve verificar diariamente a disponibilidade dos materiais necessários para a realização do procedimento.",
     "O Nutricionista consultor deverá estabelecer em sua rotina de visitas a observação de como colaboradores estão procedendo com a higienização de mãos."
    ],
    "acoesCorretivas": [
     "Treinar novamente os colaboradores.",
     "Tomar medidas previstas em Regulamento Interno."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [],
   "pendencias": [
    "Objetivos: Texto de contexto hospitalar (\"infecções relacionadas com a assistência à saúde\"; \"contato com sangue e outros fluidos corporais\"; \"ao cliente\"): revisar para serviço de alimentação.",
    "Ações corretivas: Mantida a frase genérica \"Tomar medidas previstas em Regulamento Interno\" (sem advertência/suspensão): decidir se mantém, suaviza ou retira."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-02",
   "ordem": 2,
   "titulo": "Higienização de equipamentos de refrigeração (geladeiras e freezers)",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos alimentares dos equipamentos utilizados para preparo dos alimentos e bebidas.",
     "Evitar a contaminação cruzada.",
     "Prevenir doenças e livrar o ambiente de pragas, insetos e roedores."
    ],
    "responsabilidades": [
     {
      "titulo": null,
      "itens": [
       "{{responsavel}}"
      ]
     }
    ],
    "materiais": [
     "Água",
     "Balde",
     "Detergente neutro",
     "Esponja de limpeza",
     "Álcool 70",
     "Pano descartável - perfex",
     "Na ausência de equipamento que dê suporte, utilizar caixa de isopor e gelo ou caixa termobox"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Desligar o equipamento da tomada.",
       "Retirar todos os itens e passar para outro equipamento a fim de evitar que ocorra perdas de temperatura ou caixa de isopor com gelo ou caixa termobox.",
       "Realizar o degelo do equipamento quando necessário.",
       "Escorrer a água do degelo.",
       "No balde coloque a água com detergente neutro.",
       "Esfregar com esponja e sabão as paredes internas do equipamento e por meio das borrachas e as paredes externas, retirando resíduos de alimentos.",
       "Enxaguar com água ou passar o perfex úmido para retirar o excesso de sabão existente.",
       "Borrifar com álcool 70% em toda a superfície e deixar secar naturalmente.",
       "Após 20 minutos ligar o equipamento e retornar os alimentos."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Nunca molhar o motor do equipamento diretamente em água corrente.",
     "Somente religar o equipamento após a secagem completa."
    ],
    "verificacao": [
     "Frequentemente o responsável pelo setor deve verificar a quantidade de gelo dos equipamentos.",
     "Acompanhar o registro e a frequência das limpezas na planilha de limpeza dos equipamentos.",
     "O Nutricionista consultor deve estabelecer em sua visita de rotina verificar se o procedimento está sendo feito de forma correta.",
     "O Nutricionista consultor deve arquivar as planilhas de registro."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Semanalmente ou conforme necessidade."
      ]
     }
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Responsabilidade] Verificar se é o ajudante de cozinha ou auxiliar de serviços gerais que fará esta ação e colocar o(s) nome(s) do(s) responsável(is)."
   ],
   "pendencias": [
    "Procedimento: Passo 3.2 (\"...a fim de evitar que ocorra perdas de temperatura ou caixa de isopor com gelo ou caixa termobox\") está truncado/confuso no original.",
    "Procedimento: Passo 3.6 (\"...as paredes internas do equipamento e por meio das borrachas e as paredes externas\") está confuso no original.",
    "Procedimento: Passo 3.9 (20 minutos antes de religar): confirmar tempo.",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais / procedimento: \"Álcool 70\" aparece com grafias diferentes (70, 70%, 70 °, 70 º): especificar (% v/v ou °INPM) antes de padronizar."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-03",
   "ordem": 3,
   "titulo": "Higienização de bancadas de trabalho, mesas de apoio e pias",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos alimentares das bancadas, mesas e pias da área de manipulação de alimentos.",
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Esponja de limpeza",
     "Álcool 70",
     "Pano descartável tipo Perfex"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Retirar a sujidade grossa (restos de alimentos) das bancadas, mesas ou pia com perfex.",
       "Jogar água sobre a bancada.",
       "Esfregar com esponja e detergente neutro até que toda a superfície esteja limpa.",
       "Enxaguar jogando bastante água até retirar todo o resíduo de detergente.",
       "Borrifar álcool 70 e deixar secar naturalmente antes de todas as manipulações."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Colaboradores utilizarem sapatos fechados, aventais de plástico, luvas quando necessário."
    ],
    "verificacao": [
     "O responsável pela utilização da bancada deve verificar a limpeza.",
     "O Nutricionista consultor deverá em visita técnica verificar se a limpeza está sendo feita de acordo com procedimento descrito."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Ao iniciar a produção.",
       "Nas trocas de tarefas.",
       "Quando verificar contaminação.",
       "No fim das tarefas.",
       "Sempre que necessário."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais / procedimento: \"Álcool 70\" aparece com grafias diferentes (70, 70%, 70 °, 70 º): especificar (% v/v ou °INPM) antes de padronizar."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-04",
   "ordem": 4,
   "titulo": "Higienização de placas de corte e caixas plásticas",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Esponja de limpeza",
     "Solução clorada (20 ml ou duas colheres de sopa de água sanitária para cada litro de água)",
     "Álcool 70"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Enxaguar com água corrente.",
       "Esfregar com uma esponja com detergente neutro até que toda a superfície esteja limpa.",
       "Enxaguar com água corrente até retirar todo o resíduo de detergente.",
       "Deixar imerso em solução clorada por 15 minutos.",
       "Enxaguar com água e deixar secar."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Nunca reutilizar a solução clorada, a mesma deverá ser trocada diariamente."
    ],
    "verificacao": [
     "O responsável pelo setor deve conferir diariamente a limpeza.",
     "O Nutricionista consultor deverá incluir em sua rotina de visitas a verificação da limpeza das placas e o procedimento para verificar se está sendo cumprido."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Diariamente ao final da produção."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Materiais necessários: Solução clorada \"20 ml ou duas colheres de sopa de água sanitária por litro\": a concentração depende do teor de hipoclorito do produto; conferir rótulo/norma aplicada. Imersão de 15 min a confirmar.",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais / procedimento: \"Álcool 70\" aparece com grafias diferentes (70, 70%, 70 °, 70 º): especificar (% v/v ou °INPM) antes de padronizar."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-05",
   "ordem": 5,
   "titulo": "Higienização de lixeiras",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover sujidades da lixeira, mantendo o ambiente de trabalho seguro.",
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Esponja de limpeza específica para a higienização de lixeiras",
     "Álcool 70 °"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Retirar a sujidade grossa (restos de alimentos) da lixeira.",
       "Enxaguar com água corrente na área externa do departamento.",
       "Esfregar com uma esponja específica para tal atividade com detergente neutro até que toda a superfície esteja limpa.",
       "Enxaguar com bastante água corrente até retirar todo o resíduo de detergente.",
       "Borrifar álcool 70 º.",
       "Deixar secar naturalmente antes de recolocar o saco de lixo."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Colaboradores utilizarem EPIs."
    ],
    "verificacao": [
     "Supervisor da área verificar a limpeza seguindo a frequência.",
     "Nutricionista Consultor verificar em visita técnica se as lixeiras estão sendo limpas conforme procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Diariamente ou sempre que houver necessidade."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais / procedimento: \"Álcool 70\" aparece com grafias diferentes (70, 70%, 70 °, 70 º): especificar (% v/v ou °INPM) antes de padronizar."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-06",
   "ordem": 6,
   "titulo": "Higienização de pisos, rodapés, grelhas e ralos",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos de alimentos e outras sujidades do piso.",
     "Garantir que a área de manipulação de alimentos seja segura."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Solução clorada (20 ml ou 02 colheres de sopa de água sanitária para cada litro de água)",
     "Pano de limpeza de chão",
     "Pá para recolher resíduos",
     "Vassoura com cerdas duras",
     "Balde",
     "Mangueira ou hidro jato"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Retirar a sujidade grossa (restos de alimentos) do chão com o auxílio do rodo e pá.",
       "Limpar com água e sabão ou detergente neutro.",
       "Esfregar bem com a vassoura.",
       "Enxaguar com água corrente.",
       "Borrifar com a solução clorada.",
       "Secar naturalmente."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Jogar 1 litro de solução clorada (20 ml ou 2 colheres de sopa de água sanitária para cada litro de água) nos ralos.",
     "Não é permitido varrer a seco as áreas de manipulação.",
     "Colaboradores terem o cuidado de usarem os EPIs necessários."
    ],
    "verificacao": [
     "No final do turno o supervisor da cozinha deve verificar se os ralos estão limpos, sem restos de alimentos para evitar o acesso de pragas e fazer nova lavagem do piso sempre que este estiver sujo.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Sempre que estiver sujo ou molhado, promovendo riscos aos colaboradores.",
       "Diariamente, no final da produção."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Materiais necessários: Solução clorada \"20 ml ou 02 colheres de sopa por litro\": conferir concentração pelo teor do produto.",
    "Procedimento: O passo 3.1 usa \"rodo\", que não consta em Materiais necessários (o original lista \"Pano de limpeza de chão\", \"Pá\", \"Vassoura\"...). Não acrescentei.",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-07",
   "ordem": 7,
   "titulo": "Higienização de paredes",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos alimentares das paredes.",
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Esponja de limpeza",
     "Álcool 70",
     "Pano específico para esta atividade",
     "Balde",
     "Mangueira",
     "Rodo",
     "Solução Clorada"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Retirar a sujidade grossa (restos de alimentos) das paredes com o auxílio de um pano úmido e rodo, específico para esta atividade.",
       "Cuidado para não molhar as tomadas e interruptores.",
       "Esfregar com uma esponja com detergente neutro até que toda a superfície esteja limpa.",
       "Enxaguar com água corrente.",
       "Retirar o excesso de água com o pano de chão.",
       "Borrifar álcool 70 em toda a superfície.",
       "Finalizar com solução clorada.",
       "Secar naturalmente."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Colaboradores terem o cuidado de usarem os EPIs necessários."
    ],
    "verificacao": [
     "Supervisor do turno realizar a conferência da limpeza periodicamente.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Sempre que estiver sujo.",
       "Semanalmente seguindo cronograma."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Materiais necessários: \"Solução clorada\" sem concentração; \"Álcool 70\" sem especificação (% v/v ou °INPM).",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais / procedimento: \"Álcool 70\" aparece com grafias diferentes (70, 70%, 70 °, 70 º): especificar (% v/v ou °INPM) antes de padronizar."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-08",
   "ordem": 8,
   "titulo": "Higienização de portas",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos alimentares das portas.",
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Esponja de limpeza",
     "Água sanitária",
     "Pano específico para esta atividade",
     "Balde",
     "Mangueira"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Retirar a sujidade grossa (restos de alimentos) das portas com o auxílio de um pano úmido e rodo, específico para esta atividade.",
       "Cuidado para não molhar as tomadas e interruptores.",
       "Esfregar com uma esponja com detergente neutro até que toda a superfície esteja limpa.",
       "Enxaguar com água corrente.",
       "Retirar o excesso de água com o pano específico.",
       "Finalizar com solução clorada.",
       "Secar naturalmente."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Colaboradores terem o cuidado de usarem os EPIs necessários (sapato fechado antiderrapante, avental impermeável, luvas de látex).",
     "A limpeza das maçanetas deve ser diária."
    ],
    "verificacao": [
     "Supervisor do turno realizar a conferência da limpeza periodicamente.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Semanalmente seguindo cronograma."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Materiais necessários: Materiais citam \"Água sanitária\"; o passo 3.6 manda \"solução clorada\" (sem concentração). Padronizar.",
    "Procedimento: O passo 3.1 usa \"rodo\", que não consta em Materiais necessários.",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-09",
   "ordem": 9,
   "titulo": "Higienização de utensílios em geral",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos alimentares dos utensílios.",
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Esponja de limpeza",
     "Álcool 70%"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Retirar a sujidade grossa (restos de alimentos) e resíduos.",
       "Esfregar com uma esponja com detergente neutro até que toda a superfície esteja limpa.",
       "Enxaguar com água corrente.",
       "Retirar o excesso de água com o pano específico.",
       "Finalizar com álcool.",
       "Secar naturalmente."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Os utensílios não podem ficar em contato direto com o piso em nenhum momento, devendo ser mantidos suspensos em locais apropriados. Não é permitido o uso de esponjas de metal, palha de aço, madeira, amianto."
    ],
    "verificacao": [
     "Supervisor do turno realizar a conferência da limpeza periodicamente.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Sempre que necessário."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Procedimento: O passo 3.4 usa \"pano específico\", que não consta em Materiais necessários.",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais / procedimento: \"Álcool 70\" aparece com grafias diferentes (70, 70%, 70 °, 70 º): especificar (% v/v ou °INPM) antes de padronizar."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-10",
   "ordem": 10,
   "titulo": "Higienização de equipamentos elétricos",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos alimentares dos equipamentos elétricos.",
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Esponja de limpeza",
     "Álcool 70%"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Desligar da tomada.",
       "Desmontar as partes removíveis.",
       "Retirar a sujidade grossa (restos de alimentos) e resíduos.",
       "Lavar com água, esponja com detergente neutro até que toda a superfície esteja limpa.",
       "Enxaguar com água corrente.",
       "Retirar o excesso de água com o pano específico.",
       "Finalizar com álcool.",
       "Secar naturalmente.",
       "As partes fixas, fios e tomadas deverão ser limpos à seco."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Colaboradores usarem EPIs adequados e após o procedimento montar todo equipamento novamente."
    ],
    "verificacao": [
     "Supervisor do turno realizar a conferência da limpeza periodicamente.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Seguir cronograma."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Procedimento: O passo 3.6 usa \"pano específico\", que não consta em Materiais necessários.",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais / procedimento: \"Álcool 70\" aparece com grafias diferentes (70, 70%, 70 °, 70 º): especificar (% v/v ou °INPM) antes de padronizar."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-11",
   "ordem": 11,
   "titulo": "Higienização de forno e fogão",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos alimentares do forno e do fogão.",
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Esponja de limpeza",
     "Álcool 70%",
     "Desincrustrante"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Desligar da tomada.",
       "Desmontar as partes removíveis.",
       "Retirar a sujidade grossa (restos de alimentos) e resíduos.",
       "Cobrir os queimadores.",
       "Aplicar desincrustrante e deixar agir, conforme especificação do produto.",
       "Lavar com água, detergente e esponja.",
       "Enxaguar com água corrente.",
       "Finalizar com álcool.",
       "Secar naturalmente."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Colaboradores usarem EPIs adequados e após o procedimento montar todo equipamento novamente.",
     "Não jogue água quando estiver com as peças quentes (isso pode causar oxidação das peças, empenar ou entupir os bicos).",
     "Verificar sempre o regulador de gás, em caso de danos ou vazamento chamar o técnico especializado e credenciado."
    ],
    "verificacao": [
     "Supervisor do turno realizar a conferência da limpeza periodicamente.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Diariamente após o uso."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Procedimento] Verificar na embalagem a orientação do fabricante do desincrustante (tempo de ação) e informar no passo.",
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais / procedimento: \"Álcool 70\" aparece com grafias diferentes (70, 70%, 70 °, 70 º): especificar (% v/v ou °INPM) antes de padronizar."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-12",
   "ordem": 12,
   "titulo": "Higienização de coifas",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos alimentares das coifas.",
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Esponja",
     "Desincrustrante",
     "Solução clorada"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Retirar o excesso de resíduo.",
       "Aplicar o desincrustrante e deixar agir conforme especificação do produto.",
       "Lavar com água, detergente e esponja.",
       "Enxaguar com água corrente.",
       "Finalizar com pano umedecido com solução clorada.",
       "Secar naturalmente."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "As coifas normalmente são limpas pelo pessoal da cozinha, mas o exaustor e ductos internos normalmente são limpos trimestralmente por empresa e pessoal especializado."
    ],
    "verificacao": [
     "Supervisor do turno realizar a conferência da limpeza periodicamente.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Mensalmente ou conforme cronograma de limpeza."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Procedimento: O passo 3.5 usa \"pano umedecido com solução clorada\", mas Materiais não lista pano; \"Solução clorada\" sem concentração.",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-13",
   "ordem": 13,
   "titulo": "Higienização de interruptores e tomadas",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos alimentares dos interruptores e das tomadas.",
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Pano",
     "Álcool 70%"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Desligar a chave geral, se não desligar, não use panos encharcados para evitar acidentes como choques elétricos.",
       "Retire a poeira com pincel ou pano seco.",
       "Retirar a sujidade grossa (gordura) e resíduos com pano umedecido com detergente.",
       "Secar muito bem com um pano seco.",
       "Finalizar com álcool."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Não utilize produtos químicos com alvejante ou abrasivos pois eles podem retirar a proteção anti-UV da peça.",
     "Para tirar poeira ou ferrugem dos pinos das tomadas, você pode escová-los com escova de dente, utilizando um limpador específico para contato elétrico ou vinagre.",
     "Para retirar amarelado do espelho das tomadas faça uma mistura de água quente, água sanitária e 1 colher de sopa de bicarbonato de sódio, deixe de molho essa mistura nas tomadas por 30 minutos, enxágue e seque com um pano seco, preferencialmente retire o espelho das tomadas.",
     "Caso não consiga desligar a chave geral, utilize uma fita isolante de boa qualidade para cobrir o espaço de tomadas e interruptores, lacrando todas as entradas de áreas energizadas, a fim de proteger contra choques."
    ],
    "verificacao": [
     "Supervisor do turno realizar a conferência da limpeza periodicamente.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Mensalmente ou conforme cronograma de limpeza."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Procedimento: Segurança elétrica: o POP manda limpar tomadas e interruptores; confirmar com o RT se mantém, e se a frase \"se não desligar, não use panos encharcados\" é suficiente.",
    "Cuidados especiais: 4.1 diz para não usar alvejante; 4.3 usa água sanitária misturada com água quente e bicarbonato. Contradição e risco químico (água sanitária não deve ser aquecida nem misturada com outros produtos): revisar antes de usar.",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais / procedimento: \"Álcool 70\" aparece com grafias diferentes (70, 70%, 70 °, 70 º): especificar (% v/v ou °INPM) antes de padronizar."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-14",
   "ordem": 14,
   "titulo": "Higienização de prateleiras",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Remover resíduos alimentares das prateleiras.",
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Detergente neutro",
     "Pano",
     "Álcool 70%",
     "Esponja"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Retirar a sujidade grossa (gordura e poeira) e resíduos com pano umedecido com detergente.",
       "Lavar com água, detergente e esponja.",
       "Enxaguar com água corrente.",
       "Finalizar com álcool.",
       "Deixar secar naturalmente."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "As prateleiras devem ser de material que permita limpeza e não devem estar revestidas com papel ou panos."
    ],
    "verificacao": [
     "Supervisor do turno realizar a conferência da limpeza periodicamente.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Mensalmente ou conforme cronograma de limpeza."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais / procedimento: \"Álcool 70\" aparece com grafias diferentes (70, 70%, 70 °, 70 º): especificar (% v/v ou °INPM) antes de padronizar."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-15",
   "ordem": 15,
   "titulo": "Higienização de panos de limpeza ambiental",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Garantir que os alimentos possam ser manipulados com segurança."
    ],
    "materiais": [
     "Água",
     "Sabão",
     "Escova",
     "Balde",
     "Água sanitária"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Separar os panos segundo suas áreas de serviço.",
       "Lavar com água, sabão e escova.",
       "Esfregar vigorosamente para retirada total de sujidades, resíduos e gordura.",
       "Enxaguar com água corrente.",
       "Torcer bem.",
       "Secar em local próprio ou específico para este fim sendo bem ventilado e livre de sujidades e contaminantes ambientais."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Os panos de cozinha ou de mão representam grandes focos de contaminação e com o surgimento de legislações sanitárias ficou proibido o uso de panos convencionais para secagem de equipamentos, utensílios e mãos. Devendo ser usados para essas tarefas panos descartáveis (PERFEX).",
     "Os panos convencionais só podem ser utilizados em limpeza ambiental, devendo ser separados por áreas, ou seja, pano usado em banheiro e vestiários não podem ser utilizados em áreas de processamento, os da área externa não devem ser usados em áreas internas.",
     "Não devem secar sobre equipamentos, grades de ar, etc."
    ],
    "verificacao": [
     "Supervisor do turno realizar a conferência da limpeza periodicamente.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Mensalmente ou conforme cronograma de limpeza."
      ]
     }
    ],
    "quemRealiza": [
     "Todos os colaboradores envolvidos."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Cuidados especiais: Afirma que \"com o surgimento de legislações sanitárias ficou proibido o uso de panos convencionais\" sem citar a norma: conferir na norma aplicada antes de manter.",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira.",
    "Materiais: Água sanitária / solução clorada sem concentração informada."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-16",
   "ordem": 16,
   "titulo": "Recebimento de mercadorias",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Conferir se os insumos foram entregues em embalagens corretas de armazenagem e no prazo de validade.",
     "Conferir se os insumos são de boa qualidade.",
     "Evitar contaminação alimentar a partir de insumos."
    ],
    "materiais": [
     "Formulário de compras efetuadas",
     "Caneta",
     "Produtos",
     "Estrados e/ou prateleiras de recebimento"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "O Estoquista faz o recebimento, conferindo se as especificações e se as quantidades estão de acordo com as informações solicitadas no formulário de compras.",
       "Conferir o estado das embalagens. Estas não devem estar perfuradas, amassadas, com pontos de ferrugem (latas). Os produtos congelados não devem possuir cristais de gelo na embalagem, indicando descongelamento do produto.",
       {
        "texto": "Realizar a conferência da temperatura dos alimentos refrigerados e congelados, segundo a tabela abaixo:",
        "tabela": "comp-16-t1"
       },
       "Se alguma diferença for verificada, deve ser imediatamente informada à gerência, antes do recebimento da matéria-prima.",
       "A ordem de recebimento deve respeitar a ordem de chegada do fornecedor, porém quando for recebimento de produtos que necessitam de refrigeração devem ser priorizados seu recebimento."
      ]
     }
    ],
    "verificacao": [
     {
      "texto": "Encarregado ou Responsável verificar:",
      "subitens": [
       "Condições adequadas do veículo e entregador: veículo limpo, em bom estado de conservação. Entregador uniformizado e limpo.",
       "Condições adequadas de embalagens: devem estar íntegras, sem furos, amassamentos, ferrugens, trincadas. Rótulo íntegro e legível.",
       "Condições adequadas dos produtos: ausência de mau cheiro, sem sinais de bolor ou qualquer outra condição que indique que o produto está inadequado para consumo."
      ]
     },
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Em todo recebimento de mercadorias."
      ]
     }
    ]
   },
   "tabelas": [
    {
     "id": "comp-16-t1",
     "titulo": "Temperaturas de recebimento (conforme o material)",
     "colunas": [
      "Categoria",
      "Item",
      "Limite"
     ],
     "linhas": [
      [
       "Congelados",
       "null",
       "-12 °C ou temperatura menor, ou conforme recomendação do fabricante."
      ],
      [
       "Resfriados",
       "Pescados",
       "de 2 a 3 °C (dois a três graus Celsius) ou conforme recomendação do estabelecimento produtor."
      ],
      [
       "Resfriados",
       "Carnes",
       "de 4 a 7 °C (quatro a sete graus Celsius) ou conforme recomendação do frigorífico produtor."
      ],
      [
       "Resfriados",
       "Demais produtos",
       "de 4 a 10 °C (quatro a dez graus Celsius) ou conforme recomendação do fabricante."
      ]
     ]
    }
   ],
   "notasParaOConsultor": [],
   "pendencias": [
    "Procedimento: Tabela de temperaturas de recebimento (congelados, pescados, carnes, demais): valores do material, sem fonte citada. Conferir com a norma aplicada.",
    "Procedimento: O original cita \"O Estoquista\" e \"Encarregado ou Responsável\": cargos genéricos."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-17",
   "ordem": 17,
   "titulo": "Estocagem de mercadorias",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Estocar a matéria-prima de forma adequada de modo a garantir a preservação da qualidade do alimento.",
     "Garantir a segurança dos alimentos evitando contaminação alimentar."
    ],
    "materiais": [
     "Produtos (matéria-prima)",
     "Sacos plásticos",
     "Embalagens plásticas",
     "Etiquetas",
     "Álcool 70",
     "Prateleiras",
     "Estrados",
     "Refrigerador",
     "Balança"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Após o recebimento da mercadoria, selecionar aquelas que devem ser estocadas primeiro (aquelas de maior perecibilidade, tais como laticínios, produtos cárneos e similares).",
       "Toda mercadoria deve ser retirada da embalagem secundária, como caixas de papelão ou sacos de papel.",
       "Ao retirar a embalagem secundária verificar se as embalagens primárias contêm identificação e validade. Caso contrário deverão ser colocadas etiquetas com as seguintes informações: nome do produto, data de fabricação, prazo de validade.",
       "Produtos de fabricação mais antiga devem ser posicionados de forma a serem consumidos em primeiro lugar, seguindo a regra PVPS.",
       "Os alimentos não devem ficar armazenados junto a produtos de limpeza, químicos, descartáveis ou de higiene."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Manter o estoque limpo e organizado com as portas sempre fechadas a fim de evitar a entrada de pragas.",
     "As embalagens dos produtos devem estar limpas e íntegras."
    ],
    "verificacao": [
     "Supervisor da cozinha deve diariamente verificar organização do estoque.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Diariamente sempre que chegar mercadorias."
      ]
     }
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [],
   "pendencias": [
    "Procedimento: Sigla \"PVPS\" sem definição no texto (primeiro que vence, primeiro que sai)."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "comp-18",
   "ordem": 18,
   "titulo": "Controle de temperatura de equipamentos de refrigeração e congelamento",
   "formato": "curto",
   "secoes": {
    "objetivos": [
     "Manter constância de temperaturas, assegurando a qualidade dos produtos armazenados e a segurança dos alimentos."
    ],
    "materiais": [
     "Termômetro",
     "Planilha de controle diário"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "Ler temperatura registrada no termômetro do equipamento, sempre no mesmo horário.",
       "Caso o equipamento não tenha termômetro acoplado, aferir a temperatura na parede do equipamento com termômetro a laser.",
       "Registrar a temperatura marcada na planilha.",
       "Evitar manter esses equipamentos abertos por muito tempo."
      ]
     }
    ],
    "cuidadosEspeciais": [
     "Manter constância de leitura.",
     "Grandes variações de temperatura deverão ser comunicadas à coordenação.",
     "Assegurar que os equipamentos não fiquem muito tempo abertos.",
     "Evitar a abertura constante da porta dos equipamentos para evitar grandes variações de temperatura."
    ],
    "acoesNaoConformidade": [
     "Quando a temperatura apresentar variações, solicitar à manutenção aferição do termômetro e checagem da geladeira."
    ],
    "verificacao": [
     "Supervisor do turno verifica se o registro está sendo realizado.",
     "Nutricionista Consultor verificar em visita técnica se o procedimento está sendo cumprido.",
     "Nutricionista Consultor estabelecer em sua rotina visita para acompanhar o procedimento."
    ],
    "frequencia": [
     {
      "titulo": null,
      "itens": [
       "Diária."
      ]
     }
    ],
    "quemRealiza": [
     "Encarregado."
    ],
    "acoesCorretivas": [
     "Treinar novamente colaboradores.",
     "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Quem realiza] Verificar se existe nesta empresa, existe colaboradores específicos para a realização desta tarefa."
   ],
   "pendencias": [
    "Procedimento: O texto não informa as faixas de temperatura; a planilha anexa (imagem) traz 0 °C a 5 °C (refrigerador) e −18 °C ou mais frio (freezer). Conferir com a norma aplicada.",
    "Cuidados especiais: Há repetição de ideias (manter equipamento aberto pouco tempo aparece nos passos e duas vezes nos cuidados).",
    "Ações corretivas: Mantida a frase \"Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores\": decidir se mantém, suaviza ou retira."
   ],
   "registrosSugeridos": [
    "Registro de monitoramento da temperatura de equipamentos: colunas nº, temperatura adequada, equipamento e, por dia, hora e temperatura; linha de assinatura do responsável; cabeçalho com empresa, responsável pela aferição e mês/ano."
   ]
  },
  {
   "id": "comp-19",
   "ordem": 19,
   "titulo": "Descongelamento para carnes e outros alimentos",
   "formato": "longo",
   "secoes": {
    "objetivos": [
     "Garantir o correto descongelamento de carnes e alimentos em geral, prevenindo a contaminação e a proliferação de microrganismos e garantindo a segurança dos alimentos."
    ],
    "alcance": "Este POP aplica-se a todos os alimentos que serão descongelados.",
    "definicoes": [
     {
      "termo": "Descongelamento",
      "texto": "Processo pelo qual o alimento congelado retorna à sua condição natural, mantendo suas características físico-químicas e microbiológicas seguras para o consumo."
     },
     {
      "termo": "Contaminação cruzada",
      "texto": "Transferência de microrganismos de um alimento para o outro, podendo ocorrer pelo contato direto ou por superfícies contaminadas."
     },
     {
      "termo": "Tempo e temperaturas controladas",
      "texto": "Fatores essenciais para evitar o crescimento de microrganismos patogênicos durante o processo de descongelamento."
     },
     {
      "termo": "POP – Procedimento Operacional Padronizado",
      "texto": "Documento em cópia papel, que descreve de forma objetiva instruções sequenciais para a realização de operações rotineiras e específicas para os setores, colaboradores e outros envolvidos na manipulação de alimentos."
     }
    ],
    "responsabilidades": [
     {
      "titulo": "Cargo responsável",
      "itens": [
       "Definir quem é responsável pelo descongelamento.",
       "Assegurar que existam equipamentos adequados e em bom funcionamento para o cumprimento do POP.",
       "Encaminhar equipamentos de refrigeração para manutenções preventivas e corretivas."
      ]
     },
     {
      "titulo": "Consultor de Alimentos",
      "itens": [
       "Treinar equipes.",
       "Arquivar documentos."
      ]
     },
     {
      "titulo": "Encarregados",
      "itens": [
       "Monitorar.",
       "Registrar os processos para garantir conformidade com as normas sanitárias."
      ]
     },
     {
      "titulo": "Colaboradores",
      "itens": [
       "Seguir rigorosamente este procedimento.",
       "Cumprir orientações."
      ]
     }
    ],
    "materiais": [
     "Termômetro digital",
     "Prancheta",
     "Caneta",
     "Recipientes de material liso, lavável e impermeável"
    ],
    "passos": [
     {
      "titulo": null,
      "itens": [
       "O descongelamento de carnes e demais alimentos deve ser realizado de uma das seguintes formas:"
      ]
     },
     {
      "titulo": "Opção 01: Em refrigerador",
      "itens": [
       "Coloque a carne ou outro alimento congelado em um recipiente para evitar que líquidos contaminem outros alimentos ou utensílios.",
       "Coloque os alimentos a serem descongelados na parte inferior do refrigerador, assim evita que qualquer líquido escorra para outros alimentos e ocorra a contaminação cruzada.",
       "A temperatura do refrigerador deve ser mantida entre 0ºC e 5ºC, garantindo um descongelamento gradual e seguro.",
       {
        "texto": "O tempo de descongelamento varia de acordo com o tamanho do alimento de acordo com a tabela abaixo:",
        "tabela": "comp-19-t1"
       },
       "Após o descongelamento, carnes cruas podem ser armazenadas em refrigerador com temperatura de 0ºC a 5ºC por até 2 dias antes do preparo.",
       "Peixes e frutos do mar devem ser consumidos em 24 horas.",
       "Alimentos prontos podem ser armazenados em refrigerador com temperatura de 0ºC a 5ºC entre 2 a 3 dias.",
       "Nunca recongele um alimento que foi descongelado cru."
      ]
     },
     {
      "titulo": "Opção 02: Micro-ondas",
      "itens": [
       "Permitido apenas para alimentos que serão imediatamente preparados e consumidos.",
       "Coloque o alimento a ser descongelado dentro de um recipiente próprio para micro-ondas, se possível reduza em porções menores para um descongelamento uniforme.",
       "Leve o alimento ao micro-ondas e use a função “descongelar” que reduz a potência para descongelar gradualmente. Se não tiver essa função, utilize a potência baixa (30% a 50%) para evitar o cozimento das bordas.",
       "A cada 1 a 2 minutos, vire a carne / alimento ou misture para garantir um descongelamento uniforme.",
       "Após o descongelamento, cozinhe os alimentos imediatamente, assim evitando o desenvolvimento de bactérias."
      ]
     },
     {
      "titulo": "Observações importantes",
      "itens": [
       "O descongelamento à temperatura ambiente é estritamente proibido, pois favorece a multiplicação de microrganismos patogênicos.",
       "Após o descongelamento, os alimentos não devem ser recongelados."
      ]
     }
    ],
    "frequencia": [
     {
      "titulo": "Descongelamento",
      "itens": [
       "Sempre que houver necessidade."
      ]
     }
    ],
    "acoesPreventivas": [
     "Monitoramento regular das temperaturas de equipamentos de refrigeração.",
     "Treinamento contínuo dos colaboradores sobre boas práticas e manipulação higiênica dos alimentos.",
     "Manutenção preventiva dos equipamentos utilizados no processo de descongelamento.",
     "Adoção de procedimentos rígidos de higienização, para evitar contaminação cruzada."
    ],
    "acoesCorretivas": [
     "Caso o alimento seja identificado como descongelado em temperatura inadequada ou fora do prazo recomendado, deve ser imediatamente descartado.",
     "Se houver suspeita de contaminação cruzada durante o processo, todos os utensílios utilizados devem ser higienizados e o alimento descartado.",
     "Caso o equipamento de refrigeração apresente falhas, deve ser encaminhado para a manutenção imediatamente."
    ]
   },
   "tabelas": [
    {
     "id": "comp-19-t1",
     "titulo": "Tempo de descongelamento em refrigerador (conforme o material)",
     "colunas": [
      "Alimento",
      "Temperatura",
      "Tempo"
     ],
     "linhas": [
      [
       "Carnes pequenas: (frango em pedaços, bifes e peixe)",
       "0ºC e 5ºC",
       "12 a 24 horas"
      ],
      [
       "Carnes médias (peças inteiras de frango ou carne e carne moída)",
       "0ºC e 5ºC",
       "24 horas"
      ],
      [
       "Carnes grandes (pernil, costela, peças grandes de carne bovina)",
       "0ºC e 5ºC",
       "24 a 48 horas"
      ],
      [
       "Alimentos prontos (sopas, molhos e pães)",
       "0ºC e 5ºC",
       "6 a 12 horas"
      ]
     ]
    }
   ],
   "notasParaOConsultor": [
    "[Responsabilidades] Verifique em seu cliente qual os cargos/pessoas responsáveis para realizar as tarefas abaixo tarefas abaixo, faça as modificações necessárias",
    "[Planilhas] Coloque o modelo de planilha de controle e placas orientativas utilizadas em seu cliente."
   ],
   "pendencias": [
    "Procedimentos: Temperaturas, tempos e prazos (0 °C a 5 °C; 12 a 48 h por porte; carnes cruas até 2 dias; peixes e frutos do mar 24 h; alimentos prontos 2 a 3 dias; micro-ondas a 30 % a 50 %): valores do material, sem fonte citada. Conferir com a norma aplicada.",
    "Procedimentos: A opção 02 vinha com o parêntese truncado \"(permitido apenas para alimentos\"; a ideia completa já está no primeiro passo da opção.",
    "Procedimentos: O texto mistura imperativo (\"Coloque\", \"Leve\") e infinitivo; mantido como no original.",
    "Ações corretivas: Primeiro item reescrito de forma mínima (frase confusa no original): conferir se o sentido está certo.",
    "Responsabilidades: \"Cargo responsável\" é um rótulo genérico; \"Encarregados — Monitorar\" ficou sem complemento no original.",
    "Definições: Definições sem fonte citada; conferir antes de manter."
   ],
   "registrosSugeridos": []
  },
  {
   "id": "res-01",
   "ordem": 20,
   "titulo": "Manejo de resíduos",
   "formato": "longo",
   "secoes": {
    "objetivos": [
     "Minimizar os impactos negativos no meio ambiente e evitar contaminação, acidentes e proliferação de pragas nos setores de produção de alimentos."
    ],
    "alcance": "Em toda a área física interna e externa da empresa {{empresa}}.",
    "definicoes": [
     {
      "termo": "Álcool 70%",
      "texto": "É um desinfetante de média ou baixa eficiência que contém álcool etílico e água (deionizada), ou seja, uma solução aquosa de álcool. A quantidade de álcool pode ser avaliada segundo a fração em volume ou a fração em massa."
     },
     {
      "termo": "Acondicionamento",
      "texto": "Maneira como um produto é transportado ao público cliente/consumidor, tendo como elemento essencial à embalagem."
     },
     {
      "termo": "Alimentos impróprios para o consumo",
      "texto": "São os produtos cujos prazos de validade estejam vencidos: os produtos deteriorados, alterados, adulterados, avariados, falsificados, corrompidos, fraudados, nocivos à vida ou à saúde, perigosos ou, ainda aqueles em desacordo com as normas regulamentares de fabricação, distribuição ou apresentação que por qualquer motivo, se revelem inadequados ao fim a que se destinam."
     },
     {
      "termo": "Higienização de mãos",
      "texto": "É a medida individual mais simples e menos dispendiosa para prevenir a propagação das infecções relacionadas à assistência à saúde."
     },
     {
      "termo": "Manejo",
      "texto": "O manejo tem como objetivo gerenciar o bom funcionamento das atividades de rotina de um sistema de produção."
     },
     {
      "termo": "Resíduos",
      "texto": "Materiais a serem descartados, oriundos da área de produção e das demais áreas do estabelecimento."
     },
     {
      "termo": "Resíduo Reciclável",
      "texto": "É todo material que após ser utilizado pode ser reutilizado para fabricação de novos produtos."
     },
     {
      "termo": "POP – Procedimento Operacional Padronizado",
      "texto": "Documento em cópia papel, que descreve de forma objetiva instruções sequenciais para a realização de operações rotineiras e específicas para os setores, colaboradores e outros envolvidos na manipulação de alimentos."
     }
    ],
    "responsabilidades": [
     {
      "titulo": "Proprietário",
      "itens": [
       "Definir responsabilidades.",
       "Solicitar a compra de coletores de lixo e de sacos plásticos quando necessário.",
       "Cumprir solicitações e orientações da empresa de consultoria de alimentos."
      ]
     },
     {
      "titulo": "Setor de compras, RH ou cargo do responsável",
      "itens": [
       "Comprar coletores de lixo e sacos plásticos.",
       "Cumprir solicitações e orientações do Consultor de Alimentos."
      ]
     },
     {
      "titulo": "Colaboradores e Serviços Gerais",
      "itens": [
       "Fazer lista de materiais de limpeza necessários para realizar a higienização dos coletores e sacos plásticos.",
       "Comunicar ao proprietário a falta ou a necessidade de compras de materiais ou utensílios de limpeza.",
       "Receber e organizar os materiais de limpeza no DML.",
       "Manter DML abastecido.",
       "Retirar os resíduos de todos os setores da empresa.",
       "Realizar a higienização de todos os coletores de resíduos.",
       "Comunicar a empresa de consultoria de alimentos quando houver necessidades de mudanças no procedimento.",
       "Preencher a parte de manejo de resíduos da Planilha de Registro de Higienização das Instalações Equipamentos e Móveis.",
       "Cumprir solicitações e orientações da empresa de consultoria de alimentos."
      ]
     },
     {
      "titulo": "Empresa de consultoria de alimentos ou responsável",
      "itens": [
       "Conferir em visita técnica se o procedimento está sendo realizado de maneira adequada.",
       "Conferir em visita técnica se as planilhas de registro estão preenchidas corretamente.",
       "Reportar ao encarregado as não conformidades encontradas.",
       "Verificar, assinar e arquivar as planilhas de registro de higienização.",
       "Cumprir as ações corretivas descritas neste procedimento."
      ]
     },
     {
      "titulo": "Controle de qualidade",
      "itens": [
       "Pesar os resíduos a serem recolhidos.",
       "Preencher as planilhas de registro de recolhimento de resíduos.",
       "Assinar as planilhas e solicitar a assinatura do recolhedor."
      ]
     },
     {
      "titulo": "Empresa de coleta de resíduos orgânicos",
      "itens": [
       "Recolher os resíduos.",
       "Entregar recebido e laudo de destinação final.",
       "Manter o Alvará Sanitário atualizado."
      ]
     },
     {
      "titulo": "Empresa de coleta de produtos vencidos",
      "itens": [
       "Recolher os resíduos.",
       "Entregar recebido e laudo de destinação final.",
       "Manter o Alvará Sanitário atualizado."
      ]
     },
     {
      "titulo": "Empresa de coleta de resíduos recicláveis",
      "itens": [
       "Recolher os resíduos.",
       "Entregar recebido e laudo de destinação final.",
       "Manter o Alvará Sanitário atualizado."
      ]
     },
     {
      "titulo": "Empresa de coleta urbana municipal",
      "itens": [
       "Recolher os resíduos dos container."
      ]
     }
    ],
    "materiais": [
     "Detergente neutro",
     "Esponja sintética exclusiva",
     "Rodo",
     "Vassoura",
     "Balde",
     "Mangueira",
     "Saco plástico para resíduos"
    ],
    "epis": [
     "Luva de proteção",
     "Sapato fechado de material resistente"
    ],
    "passos": [
     {
      "titulo": "Retirada dos resíduos dos coletores",
      "itens": [
       "Colocar as luvas de proteção e EPIs necessários.",
       "Retirar o saco com os resíduos dos coletores e amarrar bem firme.",
       "Colocar um novo saco nos coletores.",
       "Transportar o saco com os resíduos onde ele será depositado (coletor externo ou recipiente de apoio).",
       "Higienizar adequadamente os EPIs utilizados no procedimento.",
       "Higienizar adequadamente as mãos sempre que manipular o lixo, seguindo o procedimento de higienização de mãos."
      ]
     },
     {
      "titulo": "Coleta de resíduos orgânicos por empresa especializada",
      "itens": [
       "De acordo com a metodologia da empresa especializada."
      ]
     },
     {
      "titulo": "Coleta de produtos vencidos por empresa especializada",
      "itens": [
       "De acordo com a metodologia da empresa especializada."
      ]
     },
     {
      "titulo": "Coleta de resíduos recicláveis por empresa especializada",
      "itens": [
       "De acordo com a metodologia da empresa especializada."
      ]
     },
     {
      "titulo": "Coleta de resíduos de escritório, banheiro e copa por coleta municipal",
      "itens": [
       "Destampar o container externo.",
       "Coletar os sacos com resíduos.",
       "Caso rasgue os sacos, coletar os resíduos com auxílio de pá e vassoura.",
       "Remanejar os resíduos para a caçamba de recolhimento.",
       "Destinar corretamente os resíduos de acordo com as normas ambientais."
      ]
     },
     {
      "titulo": "Higienização dos coletores de resíduos",
      "itens": [
       "Colocar as luvas de proteção e EPIs necessários.",
       "Retirar os resíduos.",
       "Lavar tampa e o balde com esponja e detergente neutro, retirando a sujidade grossa e os resíduos impregnados.",
       "Enxaguar com água.",
       "Higienizar adequadamente os EPIs utilizados no procedimento."
      ]
     },
     {
      "titulo": "Higienização do setor de armazenamento temporário de resíduos orgânicos",
      "itens": [
       "Colocar as luvas de proteção e EPIs necessários.",
       "Retirar os resíduos.",
       "Lavar todo o setor com detergente neutro retirando a sujidade grossa e os resíduos impregnados.",
       "Enxaguar com água corrente.",
       "Limpar os ralos e grelhas de escoamento.",
       "Higienizar adequadamente os EPIs utilizados no procedimento."
      ]
     },
     {
      "titulo": "Higienização de caixa de gordura",
      "itens": [
       "Colocar as luvas de proteção e EPIs necessários.",
       "Retirar a tampa da caixa.",
       "Remover os resíduos com o auxílio de um balde próprio para essa finalidade.",
       "Colocar os resíduos dentro de recipientes resistentes devidamente identificados para o recolhimento e descarte adequado pela empresa especializada. Nunca descarte diretamente no esgoto.",
       "Higienizar adequadamente os EPIs utilizados no procedimento."
      ]
     },
     {
      "titulo": "Documentação de coleta de resíduos",
      "itens": [
       "Solicitar às empresas o recibo de recolhimento dos resíduos e o laudo de destinação final. Deve conter o peso total recolhido.",
       "Arquivar os recibos e laudos na pasta sanitária."
      ]
     }
    ],
    "frequencia": [
     {
      "titulo": "Da retirada do resíduos dos setores de produção",
      "itens": [
       "Diariamente em horários que não esteja ocorrendo produção de alimentos.",
       "Sempre que necessário."
      ]
     },
     {
      "titulo": "Da retirada do lixo dos banheiros, refeitórios e áreas administrativas",
      "itens": [
       "2 vezes ao dia.",
       "Sempre que necessário."
      ]
     },
     {
      "titulo": "Do recolhimento de resíduos orgânicos",
      "itens": [
       "3x por semana.",
       "Sempre que necessário."
      ]
     },
     {
      "titulo": "Do recolhimento de produtos vencidos",
      "itens": [
       "15 em 15 dias.",
       "Sempre que necessário."
      ]
     },
     {
      "titulo": "Do recolhimento de produtos recicláveis",
      "itens": [
       "15 em 15 dias.",
       "Sempre que necessário."
      ]
     },
     {
      "titulo": "Do recolhimento de resíduos pela coleta municipal",
      "itens": [
       "3x por semana pela empresa de coleta urbana municipal."
      ]
     },
     {
      "titulo": "Das higienizações — Coletores da produção",
      "itens": [
       "Diariamente.",
       "Sempre que necessário."
      ]
     },
     {
      "titulo": "Das higienizações — Coletores de banheiro e setores administrativos",
      "itens": [
       "1x por semana.",
       "Sempre que necessário."
      ]
     },
     {
      "titulo": "Das higienizações — Higienização da caixa de gordura",
      "itens": [
       "3x por semana.",
       "Sempre que necessário."
      ]
     },
     {
      "titulo": "Das higienizações — Armazenamento temporário de resíduos",
      "itens": [
       "3x por semana, após o recolhimento.",
       "Sempre que houver recolhimento."
      ]
     },
     {
      "titulo": "Das higienizações — Container externos",
      "itens": [
       "3x por semana após o recolhimento."
      ]
     }
    ],
    "acoesCorretivas": [
     "Reciclagem de treinamento referente aos procedimentos.",
     "Verificar procedimento e fazer alterações no mesmo caso seja necessário."
    ]
   },
   "tabelas": [],
   "notasParaOConsultor": [
    "[Legislações] Caso sua região possua código sanitário municipal ou estadual, descreva aqui como descrito acima.",
    "[Responsabilidades] Verifique em seu cliente qual os cargos responsáveis para realizar as tarefas abaixo tarefas abaixo, faça as modificações necessárias",
    "[Responsabilidades] (caso seja você o responsável, verifique quais as tarefas você irá desenvolver nesse cliente e faça as alterações necessárias.)",
    "[Procedimentos] faça as alterações necessárias de acordo como é realizado no seu cliente, e lembre-se, o POP tem que ser descrito de acordo com a realidade.",
    "[Procedimentos] verifique como é feito o manejo dos resíduos pelas empresas especializadas, se preferir pode solicitar o POP da empresa especializada e anexar junto a este POP ou descrevê-lo.",
    "[Frequência] Ajuste as frequências de acordo como acontece no seu cliente.",
    "[Ações corretivas] Verifique e faça as alterações se necessário."
   ],
   "pendencias": [
    "Responsabilidades: Cargos genéricos do material (\"Setor de compras, RH ou cargo do responsável\", \"Controle de qualidade\", \"Empresa de coleta…\"): adaptar por empresa.",
    "Responsabilidades: \"Entregar recebido e laudo de destinação final\" (3 grupos): provável \"recibo\" (o item de documentação fala em recibo de recolhimento); não alterei.",
    "Definições: Definições copiadas de outras fontes (inclui texto de área da saúde e o de \"alimentos impróprios para o consumo\") sem citar fonte; conferir antes de manter.",
    "Procedimentos: As três coletas por empresa especializada dizem só \"de acordo com a metodologia da empresa especializada\"; o original sugere anexar o POP da empresa.",
    "Procedimentos: Sigla \"DML\" não definida no texto (depósito de material de limpeza).",
    "Frequência: Frequências de exemplo do material (3x por semana, 15 em 15 dias etc.): ajustar à realidade de cada empresa.",
    "Ações corretivas: Retirados os itens \"aplicar as punições…\" e \"realizar o desligamento do colaborador\" (decisão acordada). Restam: reciclagem de treinamento e revisão do procedimento."
   ],
   "registrosSugeridos": [
    "Registro de recolhimento de resíduos — tipo \"Orgânico\": cabeçalho (empresa, consultor(a), responsável pelo envio) e colunas data do recolhimento, descrição do resíduo recolhido, quantidade (kg/L), empresa recolhedora, assinatura do responsável pelo envio, assinatura do responsável pelo recolhimento.",
    "Mesmo registro, tipo \"Recicláveis\".",
    "Mesmo registro, tipo \"Produtos fora do prazo de validade ou impróprios para o consumo\".",
    "Mesmo registro, tipo \"Óleo usado\" (quantidade em litros)."
   ]
  }
 ]
};
