 // Coordenadas aproximadas da região da UNINASSAU Parangaba
    const origem = {
      lat: -3.77709,
      lon: -38.56201
    };

    // Valores fictícios, ajustáveis para a simulação
    const TAXA_BASE = 3.50;
    const PRECO_POR_KM = 1.20;

    let destinoAtual = "";

    const campoCep = document.getElementById("cep");

    campoCep.addEventListener("input", function () {
      let numeros = this.value.replace(/\D/g, "").slice(0, 8);

      if (numeros.length > 5) {
        numeros = numeros.slice(0, 5) + "-" + numeros.slice(5);
      }

      this.value = numeros;
    });

    async function calcularFrete() {
      const cep = campoCep.value.replace(/\D/g, "");
      const mensagem = document.getElementById("mensagem");
      const botao = document.getElementById("consultar");
      const resultado = document.getElementById("resultado");

      resultado.style.display = "none";

      if (cep.length !== 8) {
        mensagem.textContent = "Digite um CEP válido com 8 números.";
        return;
      }

      botao.disabled = true;
      mensagem.textContent = "Consultando endereço e calculando rota...";

      try {
        // 1. Consulta o CEP pela API pública ViaCEP
        const respostaCEP = await fetch(
          `https://viacep.com.br/ws/${cep}/json/`
        );

        if (!respostaCEP.ok) {
          throw new Error("Não foi possível consultar o CEP.");
        }

        const dados = await respostaCEP.json();

        if (dados.erro) {
          throw new Error("CEP não encontrado.");
        }

        if (dados.uf !== "CE" ||
            dados.localidade !== "Fortaleza") {
          throw new Error(
            "Esta simulação atende apenas destinos em Fortaleza-CE."
          );
        }

        if (!dados.logradouro) {
          throw new Error(
            "O CEP não informa uma rua específica. Tente um CEP de logradouro."
          );
        }

        // 2. Procura as coordenadas do endereço no OpenStreetMap
        const enderecoBusca = [
          dados.logradouro,
          dados.bairro,
          dados.localidade,
          dados.uf,
          "Brasil"
        ].filter(Boolean).join(", ");

        const urlGeo =
          "https://nominatim.openstreetmap.org/search?format=jsonv2" +
          "&limit=1&q=" + encodeURIComponent(enderecoBusca);

        const respostaGeo = await fetch(urlGeo);
        const locais = await respostaGeo.json();

        if (!locais.length) {
          throw new Error(
            "Não foi possível localizar este endereço no mapa."
          );
        }

        const destino = {
          lat: Number(locais[0].lat),
          lon: Number(locais[0].lon)
        };

        // 3. Calcula a distância rodoviária usando OSRM
        const urlRota =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${origem.lon},${origem.lat};${destino.lon},${destino.lat}` +
          "?overview=false";

        const respostaRota = await fetch(urlRota);
        const dadosRota = await respostaRota.json();

        if (
          dadosRota.code !== "Ok" ||
          !dadosRota.routes ||
          !dadosRota.routes.length
        ) {
          throw new Error("Não foi possível calcular a rota.");
        }

        const km = dadosRota.routes[0].distance / 1000;

        // 4. Calcula a estimativa do frete
        const frete = TAXA_BASE + km * PRECO_POR_KM;

        document.getElementById("endereco").textContent =
          `${dados.logradouro}, ${dados.bairro} — ` +
          `${dados.localidade}/${dados.uf}`;

        document.getElementById("distancia").textContent =
          km.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          }) + " km";

        document.getElementById("preco").textContent =
          frete.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          });

        destinoAtual = enderecoBusca;

        resultado.style.display = "block";
        mensagem.textContent = "Consulta realizada com sucesso!";

      } catch (erro) {
        mensagem.textContent = erro.message ||
          "Erro ao consultar os serviços. Tente novamente.";
      } finally {
        botao.disabled = false;
      }
    }

    function abrirUber() {
      const destino = encodeURIComponent(destinoAtual);

      const url =
        "https://m.uber.com/ul/?action=setPickup" +
        "&pickup=my_location" +
        "&dropoff[formatted_address]=" + destino;

      window.open(url, "_blank");
    }