from flask import Flask, request, render_template, jsonify, redirect, url_for
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
import re

# Configuração do Supabase
SUPABASE_URL = "https://wvrxfpxxdtlwybnadrjo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cnhmcHh4ZHRsd3libmFkcmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTc1ODgsImV4cCI6MjA2ODA5MzU4OH0.j0v203lLI_n6LcBvRRiWtCjbwJT3OIiOFJY8apUZDnM"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# Teste simples para verificar a conexão
try:
    response = supabase.table('acoes').select("*").limit(1).execute()
    print("✅ Conexão com o Supabase bem-sucedida!")
except Exception as e:
    print("❌ Erro ao conectar no Supabase:", e)


app = Flask(__name__)

# Página do formulário
@app.route('/')
def index():
    return render_template('formulario.html')

# Rota para extrair dados automaticamente ao digitar a URL
@app.route('/extrair_dados', methods=['POST'])
def extrair_dados():
    data = request.get_json()
    url = data.get('url')
    try:
        nome, valor_atual, dividend_yield, patrimonio = raspar_statusinvest(url)
        return jsonify({
            'nome': nome,
            'valor': valor_atual,
            'dividend_yield': dividend_yield,
            'patrimonio': patrimonio
        })
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

# Rota que salva os dados no Supabase
@app.route('/salvar', methods=['POST'])
def salvar():
    codigo = request.form['Cod_acao']
    
    # Verificar se essa ação já está cadastrada (pelo código)
    resultado = supabase.table('acoes').select("Cod_acao").eq("Cod_acao", codigo).execute()

    if resultado.data:
        # Já existe, retorna JSON com erro
        return jsonify({'erro': f"A ação '{codigo}' já foi cadastrada!"})

    # Se não existir, continua com o cadastro
    dados = {
        'Cod_acao': codigo,
        'Valor_atual': float(request.form['Valor_atual']),
        'Quantidade_acao': int(request.form['Quantidade_acao']),
        'Yeald': float(request.form['Yeald']),
        'Divdendos': float(request.form['Divdendos']),
        'PatrimonioAnual': float(request.form['PatrimonioAnual']),
        'Patrimonio_mensal': float(request.form['Patrimonio_mensal']),
    }

    supabase.table('acoes').insert(dados).execute()
    return jsonify({'sucesso': True})


@app.route('/buscar_acao')
def buscar_acao():
    codigo = request.args.get('cod')
    resultado = supabase.table('acoes').select("*").eq("Cod_acao", codigo).limit(1).execute()

    if resultado.data:
        return jsonify(resultado.data[0])
    else:
        return jsonify({'erro': 'Ação não encontrada'}), 404
    


@app.route("/verificar_existente", methods=["POST"])
def verificar_existente():
    data = request.get_json()
    cod = data.get("Cod_acao")
    if not cod:
        return jsonify({"erro": "Código da ação não informado"}), 400

    resultado = supabase.table("acoes").select("*").eq("Cod_acao", cod).execute()

    if resultado.data:
        return jsonify({"existe": True})
    else:
        return jsonify({"existe": False})

    



@app.route('/atualizar_quantidade', methods=['POST'])
def atualizar_quantidade():
    cod = request.form['Cod_acao']
    nova_qtd = int(request.form['Quantidade_acao'])

    try:
        supabase.table('acoes')\
            .update({'Quantidade_acao': nova_qtd})\
            .eq('Cod_acao', cod)\
            .execute()
        return jsonify({"sucesso": True})
    except Exception as e:
        return jsonify({"erro": str(e)}), 400





# Função que faz scraping da página do StatusInvest
def raspar_statusinvest(url):
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')

    # Nome da ação (ex: BB Seguridade)
    nome = soup.find('h1').text.strip()

    # Pega os dois primeiros valores da classe .value
    valores = soup.find_all('strong', class_='value')
    if len(valores) < 2:
        raise Exception("Valores insuficientes encontrados.")

    valor_atual = float(valores[0].text.strip().replace("R$", "").replace(".", "").replace(",", "."))
    dividend_yield = float(valores[3].text.strip().replace("R$", "").replace(".", "").replace(",", "."))

    # Patrimônio líquido (procura pela string e extrai valor)
    patrimonio = None
    texto = soup.find(string=re.compile("Patrimônio líquido"))
    if texto:
        parent = texto.find_parent()
        if parent:
            match = re.search(r"R\$\s*([\d\.\,]+)", parent.text)
            if match:
                patrimonio = float(match.group(1).replace(".", "").replace(",", "."))
    
    if patrimonio is None:
        patrimonio = 0.0  # valor padrão se não encontrado

    return nome, valor_atual, dividend_yield, patrimonio

if __name__ == '__main__':
    app.run(debug=True)


