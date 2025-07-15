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
    const investimentoTotalInput = document.getElementById("investimentoTotalInput");
    const form = document.querySelector("form");

    let modoEdicao = false;

    function calcularValores() {
        const valorAtual = parseFloat(valorInput.value.replace(",", ".")) || 0;
        const quantidade = parseFloat(qtdInput.value) || 0;

        // Dividendos por ação (vem preenchido apenas ao extrair da URL)
        const dividendosPorAcao = parseFloat(dividendosInput.value.replace(",", ".")) || 0;

        // Patrimônio Anual = dividendosPorAcao * quantidade
        const patrimonioAnual = dividendosPorAcao * quantidade;
        patrimonioAnualInput.value = patrimonioAnual.toFixed(2);

        // Patrimônio Mensal = Patrimônio Anual / 12
        const patrimonioMensal = patrimonioAnual / 12;
        patrimonioMensalInput.value = patrimonioMensal.toFixed(2);

        // Investimento Total = quantidade * valorAtual
        const investimentoTotal = quantidade * valorAtual;
        investimentoTotalInput.value = investimentoTotal.toFixed(2);
    }

    function preencherDados(data) {
        if (data.nome) codgacaoInput.value = data.nome;
        if (data.valor) valorInput.value = data.valor;
        if (data.dividend_yield) dyInput.value = data.dividend_yield;

        // Calcula dividendos por ação e preenche o campo fixo
        if (data.valor && data.dividend_yield) {
            const dy = parseFloat(data.dividend_yield.toString().replace(",", ".")) || 0;
            const valorAtual = parseFloat(data.valor.toString().replace(",", ".")) || 0;
            const dividendos = (dy / 100) * valorAtual;
            dividendosInput.value = dividendos.toFixed(2);
        }

        if (data.patrimonio) patrimonioInput.value = data.patrimonio;

        calcularValores();
    }

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

            fetch("/verificar_existente", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ Cod_acao: data.nome }),
            })
            .then((res) => res.json())
            .then((res) => {
                if (res.existe) {
                    alert("⚠️ Esta ação já está cadastrada!\nVocê pode apenas editar a quantidade.");
                }
                preencherDados(data);
            });
        })
        .catch((e) => {
            console.error("Erro:", e);
            alert("Erro na requisição");
        });
    });

    [valorInput, qtdInput].forEach(input => {
        input.addEventListener("input", calcularValores);
    });

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = new URLSearchParams(formData);
        const rota = modoEdicao ? "/atualizar_quantidade" : "/salvar";

        fetch(rota, {
            method: "POST",
            body: data
        })
        .then(res => res.json())
        .then(res => {
            if (res.erro) {
                if (!modoEdicao && confirm(res.erro + "\n\nDeseja editar apenas a quantidade de ações?")) {
                    const cod = codgacaoInput.value;
                    fetch(`/buscar_acao?cod=${encodeURIComponent(cod)}`)
                        .then((r) => r.json())
                        .then((dados) => {
                            valorInput.value = dados.Valor_atual;
                            dyInput.value = dados.Yeald;
                            dividendosInput.value = dados.Dividendos;
                            patrimonioAnualInput.value = dados.PatrimonioAnual;
                            patrimonioMensalInput.value = dados.Patrimonio_mensal;

                            document.querySelectorAll("input").forEach(input => {
                                if (input.name !== "Quantidade_acao" && input.name !== "Cod_acao") {
                                    input.readOnly = true;
                                }
                            });

                            modoEdicao = true;
                            alert("Agora você pode editar apenas a quantidade de ações.");
                        });
                } else {
                    alert("Erro: " + res.erro);
                }
            } else {
                alert("Ação salva com sucesso!");
                window.location.reload();
            }
        })
        .catch(err => {
            console.error("Erro ao salvar:", err);
            alert("Erro inesperado. Veja o console.");
        });
    });
});
