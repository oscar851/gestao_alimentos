const CAPITACAO_DATA = [
    { id: 1, grupo: "Carnes", categoria: "Bovino", preparacao: "Picanha Grelhada", nome: "Picanha Grelhada", capitacao_minima: 120, capitacao_media: 180, capitacao_maxima: 250, custoUnitario: 28.50 },
    { id: 2, grupo: "Carnes", categoria: "Bovino", preparacao: "Filé Mignon ao Molho", nome: "Filé Mignon ao Molho", capitacao_minima: 100, capitacao_media: 150, capitacao_maxima: 200, custoUnitario: 35.00 },
    { id: 3, grupo: "Carnes", categoria: "Suíno", preparacao: "Costela BBQ", nome: "Costela BBQ", capitacao_minima: 150, capitacao_media: 220, capitacao_maxima: 300, custoUnitario: 18.90 },
    { id: 4, grupo: "Carnes", categoria: "Suíno", preparacao: "Lombo Assado", nome: "Lombo Assado", capitacao_minima: 100, capitacao_media: 140, capitacao_maxima: 180, custoUnitario: 15.50 },
    { id: 5, grupo: "Carnes", categoria: "Aves", preparacao: "Peito de Frango Grelhado", nome: "Peito de Frango Grelhado", capitacao_minima: 100, capitacao_media: 150, capitacao_maxima: 200, custoUnitario: 12.00 },
    { id: 6, grupo: "Carnes", categoria: "Aves", preparacao: "Coxa e Sobrecoxa Assada", nome: "Coxa e Sobrecoxa Assada", capitacao_minima: 120, capitacao_media: 180, capitacao_maxima: 250, custoUnitario: 9.80 },
    { id: 7, grupo: "Carnes", categoria: "Peixe", preparacao: "Salmão Grelhado", nome: "Salmão Grelhado", capitacao_minima: 100, capitacao_media: 150, capitacao_maxima: 200, custoUnitario: 42.00 },
    { id: 8, grupo: "Carnes", categoria: "Peixe", preparacao: "Tilápia Empanada", nome: "Tilápia Empanada", capitacao_minima: 100, capitacao_media: 140, capitacao_maxima: 180, custoUnitario: 16.50 },
    { id: 9, grupo: "Massas", categoria: "Fresca", preparacao: "Espaguete ao Alho e Óleo", nome: "Espaguete ao Alho e Óleo", capitacao_minima: 80, capitacao_media: 120, capitacao_maxima: 160, custoUnitario: 6.50 },
    { id: 10, grupo: "Massas", categoria: "Fresca", preparacao: "Fettuccine Alfredo", nome: "Fettuccine Alfredo", capitacao_minima: 100, capitacao_media: 150, capitacao_maxima: 200, custoUnitario: 10.00 },
    { id: 11, grupo: "Massas", categoria: "Recheada", preparacao: "Ravioli de Queijo", nome: "Ravioli de Queijo", capitacao_minima: 100, capitacao_media: 150, capitacao_maxima: 200, custoUnitario: 14.00 },
    { id: 12, grupo: "Massas", categoria: "Recheada", preparacao: "Ravioli de Carne", nome: "Ravioli de Carne", capitacao_minima: 120, capitacao_media: 170, capitacao_maxima: 220, custoUnitario: 16.00 },
    { id: 13, grupo: "Acompanhamentos", categoria: "Salada", preparacao: "Salada Caesar", nome: "Salada Caesar", capitacao_minima: 80, capitacao_media: 120, capitacao_maxima: 160, custoUnitario: 8.50 },
    { id: 14, grupo: "Acompanhamentos", categoria: "Salada", preparacao: "Salada Grega", nome: "Salada Grega", capitacao_minima: 80, capitacao_media: 120, capitacao_maxima: 160, custoUnitario: 7.50 },
    { id: 15, grupo: "Acompanhamentos", categoria: "Legumes", preparacao: "Legumes Salteados", nome: "Legumes Salteados", capitacao_minima: 80, capitacao_media: 120, capitacao_maxima: 160, custoUnitario: 5.50 },
    { id: 16, grupo: "Acompanhamentos", categoria: "Legumes", preparacao: "Purê de Batata", nome: "Purê de Batata", capitacao_minima: 100, capitacao_media: 150, capitacao_maxima: 200, custoUnitario: 4.00 },
    { id: 17, grupo: "Acompanhamentos", categoria: "Arroz", preparacao: "Arroz Branco", nome: "Arroz Branco", capitacao_minima: 60, capitacao_media: 100, capitacao_maxima: 140, custoUnitario: 3.50 },
    { id: 18, grupo: "Acompanhamentos", categoria: "Arroz", preparacao: "Arroz à Grega", nome: "Arroz à Grega", capitacao_minima: 80, capitacao_media: 120, capitacao_maxima: 160, custoUnitario: 5.00 },
    { id: 19, grupo: "Bebidas", categoria: "Sucos", preparacao: "Suco de Laranja", nome: "Suco de Laranja", capitacao_minima: 150, capitacao_media: 250, capitacao_maxima: 350, custoUnitario: 4.50 },
    { id: 20, grupo: "Bebidas", categoria: "Sucos", preparacao: "Suco de Limão", nome: "Suco de Limão", capitacao_minima: 150, capitacao_media: 250, capitacao_maxima: 350, custoUnitario: 3.50 },
    { id: 21, grupo: "Bebidas", categoria: "Refrigerantes", preparacao: "Refrigerante Cola", nome: "Refrigerante Cola", capitacao_minima: 200, capitacao_media: 300, capitacao_maxima: 400, custoUnitario: 3.00 },
    { id: 22, grupo: "Bebidas", categoria: "Refrigerantes", preparacao: "Guaraná", nome: "Guaraná", capitacao_minima: 200, capitacao_media: 300, capitacao_maxima: 400, custoUnitario: 2.80 },
    { id: 23, grupo: "Sobremesas", categoria: "Bolos", preparacao: "Bolo de Chocolate", nome: "Bolo de Chocolate", capitacao_minima: 80, capitacao_media: 120, capitacao_maxima: 160, custoUnitario: 7.00 },
    { id: 24, grupo: "Sobremesas", categoria: "Bolos", preparacao: "Bolo de Cenoura", nome: "Bolo de Cenoura", capitacao_minima: 80, capitacao_media: 120, capitacao_maxima: 160, custoUnitario: 5.50 },
    { id: 25, grupo: "Sobremesas", categoria: "Mousses", preparacao: "Mousse de Maracujá", nome: "Mousse de Maracujá", capitacao_minima: 80, capitacao_media: 120, capitacao_maxima: 160, custoUnitario: 6.50 },
    { id: 26, grupo: "Sobremesas", categoria: "Mousses", preparacao: "Mousse de Chocolate", nome: "Mousse de Chocolate", capitacao_minima: 80, capitacao_media: 120, capitacao_maxima: 160, custoUnitario: 8.00 },
    { id: 27, grupo: "Café da Manhã", categoria: "Pães", preparacao: "Pão Francês", nome: "Pão Francês", capitacao_minima: 50, capitacao_media: 80, capitacao_maxima: 120, custoUnitario: 4.50 },
    { id: 28, grupo: "Café da Manhã", categoria: "Pães", preparacao: "Pão de Queijo", nome: "Pão de Queijo", capitacao_minima: 60, capitacao_media: 100, capitacao_maxima: 140, custoUnitario: 8.00 },
    { id: 29, grupo: "Café da Manhã", categoria: "Laticínios", preparacao: "Iogurte Natural", nome: "Iogurte Natural", capitacao_minima: 100, capitacao_media: 150, capitacao_maxima: 200, custoUnitario: 5.50 },
    { id: 30, grupo: "Café da Manhã", categoria: "Laticínios", preparacao: "Queijo Minas", nome: "Queijo Minas", capitacao_minima: 50, capitacao_media: 80, capitacao_maxima: 120, custoUnitario: 12.00 }
];

const RECEITAS_DATA = [
    {
        id: 1,
        nome: "Feijoada Completa",
        grupo: "Carnes",
        categoria: "Executivo",
        pessoas: 30,
        ingredientes: [
            { id: 3, qtd: 4.0, un: "kg" },
            { id: 4, qtd: 2.5, un: "kg" },
            { id: 5, qtd: 3.0, un: "kg" },
            { id: 17, qtd: 2.0, un: "kg" },
            { id: 15, qtd: 1.5, un: "kg" }
        ]
    },
    {
        id: 2,
        nome: "Jantar Formal — Filé & Salmão",
        grupo: "Executivo",
        categoria: "Jantar",
        pessoas: 30,
        ingredientes: [
            { id: 2, qtd: 3.5, un: "kg" },
            { id: 7, qtd: 3.0, un: "kg" },
            { id: 13, qtd: 2.0, un: "kg" },
            { id: 16, qtd: 2.5, un: "kg" },
            { id: 10, qtd: 1.5, un: "kg" }
        ]
    },
    {
        id: 3,
        nome: "Café da Manhã Completo",
        grupo: "Café da Manhã",
        categoria: "Buffet",
        pessoas: 30,
        ingredientes: [
            { id: 27, qtd: 2.0, un: "kg" },
            { id: 28, qtd: 1.5, un: "kg" },
            { id: 29, qtd: 3.0, un: "kg" },
            { id: 30, qtd: 1.0, un: "kg" },
            { id: 19, qtd: 5.0, un: "L" }
        ]
    },
    {
        id: 4,
        nome: "Almoço Italiano",
        grupo: "Massas",
        categoria: "Executivo",
        pessoas: 30,
        ingredientes: [
            { id: 10, qtd: 3.0, un: "kg" },
            { id: 11, qtd: 2.5, un: "kg" },
            { id: 5, qtd: 2.0, un: "kg" },
            { id: 13, qtd: 1.5, un: "kg" },
            { id: 23, qtd: 2.0, un: "kg" }
        ]
    },
    {
        id: 5,
        nome: "Churrasco Premium",
        grupo: "Carnes",
        categoria: "Eventos",
        pessoas: 30,
        ingredientes: [
            { id: 1, qtd: 3.5, un: "kg" },
            { id: 3, qtd: 4.0, un: "kg" },
            { id: 5, qtd: 3.0, un: "kg" },
            { id: 15, qtd: 2.0, un: "kg" },
            { id: 21, qtd: 8.0, un: "L" }
        ]
    },
    {
        id: 6,
        nome: "Buffet de Frutos do Mar",
        grupo: "Carnes",
        categoria: "Peixe",
        pessoas: 30,
        ingredientes: [
            { id: 7, qtd: 3.5, un: "kg" },
            { id: 8, qtd: 3.0, un: "kg" },
            { id: 13, qtd: 2.0, un: "kg" },
            { id: 16, qtd: 2.5, un: "kg" },
            { id: 25, qtd: 2.0, un: "kg" }
        ]
    },
    {
        id: 7,
        nome: "Menu Vegetariano",
        grupo: "Acompanhamentos",
        categoria: "Vegetariano",
        pessoas: 30,
        ingredientes: [
            { id: 15, qtd: 3.0, un: "kg" },
            { id: 16, qtd: 2.5, un: "kg" },
            { id: 17, qtd: 2.0, un: "kg" },
            { id: 13, qtd: 2.0, un: "kg" },
            { id: 23, qtd: 2.0, un: "kg" }
        ]
    },
    {
        id: 8,
        nome: "Festa Junina",
        grupo: "Eventos",
        categoria: "Tradicional",
        pessoas: 30,
        ingredientes: [
            { id: 4, qtd: 3.0, un: "kg" },
            { id: 16, qtd: 3.0, un: "kg" },
            { id: 23, qtd: 2.5, un: "kg" },
            { id: 19, qtd: 5.0, un: "L" },
            { id: 21, qtd: 6.0, un: "L" }
        ]
    },
    {
        id: 9,
        nome: "Jantar Romântico",
        grupo: "Executivo",
        categoria: "Jantar",
        pessoas: 30,
        ingredientes: [
            { id: 2, qtd: 2.5, un: "kg" },
            { id: 7, qtd: 2.0, un: "kg" },
            { id: 10, qtd: 1.5, un: "kg" },
            { id: 13, qtd: 1.0, un: "kg" },
            { id: 26, qtd: 1.5, un: "kg" }
        ]
    },
    {
        id: 10,
        nome: "Brunch de Domingo",
        grupo: "Café da Manhã",
        categoria: "Buffet",
        pessoas: 30,
        ingredientes: [
            { id: 27, qtd: 2.0, un: "kg" },
            { id: 28, qtd: 1.5, un: "kg" },
            { id: 5, qtd: 2.0, un: "kg" },
            { id: 13, qtd: 1.5, un: "kg" },
            { id: 19, qtd: 4.0, un: "L" }
        ]
    }
];
