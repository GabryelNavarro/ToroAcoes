
    document.addEventListener("DOMContentLoaded", function () {
        const urlInput = document.getElementById("urlInput");
        const codgacaoInput = document.getElementById("codgacaoInput");
        const valorInput = document.getElementById("valorInput");
        const dyInput = document.getElementById("dyInput");
        const qtdInput = document.querySelector("input[name='Quantidade_acao']");
        const dividendosInput = document.querySelector("input[name='Divdendos']");
        const patrimonioAnualInput = document.getElementById("patrimonioAnualInput");
        const patrimonioMensalInput = document.getElementById("patrimonioMensalInput");
        const patrimonioInput = document.getElementById("patrimonioInput");

        // Função para preencher o formulário com dados extraídos
        function preencherDados(data) {
            if (data.nome) codgacaoInput.value = data.nome;
            if (data.valor) valorInput.value = data.valor;
            if (data.dividend_yield) dyInput.value = data.dividend_yield;
            if (data.patrimonio) patrimonioInput.value = data.patrimonio;
            calcularValores(); // Atualiza os cálculos também
        }

        // Evento ao mudar o campo de URL
        urlInput.addEventListener("change", function () {
            const url = this.value;
            if (!url) return;

            fetch("/extrair_dados", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.erro) {
                        alert("Erro: " + data.erro);
                        return;
                    }
                    preencherDados(data);
                })
                .catch((e) => {
                    console.error("Erro:", e);
                    alert("Erro na requisição");
                });
        });

        // Cálculo automático de Dividendos, Patrimônio Anual e Mensal
        function calcularValores() {
            const dy = parseFloat(dyInput.value.replace(",", ".")) || 0;
            const valorAtual = parseFloat(valorInput.value.replace(",", ".")) || 0;
            const quantidade = parseFloat(qtdInput.value) || 0;

            const dividendos = (dy / 100) * valorAtual;
            dividendosInput.value = dividendos.toFixed(2);

            const patrimonioAnual = dividendos * quantidade;
            patrimonioAnualInput.value = patrimonioAnual.toFixed(2);

            const patrimonioMensal = patrimonioAnual / 12;
            patrimonioMensalInput.value = patrimonioMensal.toFixed(2);
        }

        // Adiciona listeners nos campos para disparar os cálculos
        [dyInput, valorInput, qtdInput].forEach(input => {
            input.addEventListener("input", calcularValores);
        });
    });

