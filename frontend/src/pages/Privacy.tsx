import './StaticPages.css';

export const Privacy = () => {
    return (
        <div className="static-page container">
            <h1 className="static-title">Política de Privacidade</h1>
            <div className="static-content box-card">
                <section>
                    <h2>1. Coleta de Informações</h2>
                    <p>Coletamos informações básicas para o funcionamento da plataforma, como nome, e-mail, telefone e endereço (cidade/estado). Essas informações são necessárias para o cadastro e para que outros usuários entrem em contato sobre seus anúncios.</p>
                </section>

                <section>
                    <h2>2. Uso de Dados</h2>
                    <p>Seus dados são utilizados para personalizar sua experiência, processar transações de planos de destaque e permitir a comunicação entre compradores e vendedores através do nosso chat interno ou WhatsApp.</p>
                </section>

                <section>
                    <h2>3. Proteção de Dados</h2>
                    <p>Implementamos medidas de segurança para manter a segurança de suas informações pessoais. Seus dados de pagamento são processados por parceiros seguros e não ficam armazenados de forma descriptografada em nossos servidores.</p>
                </section>

                <section>
                    <h2>4. Compartilhamento de Informações</h2>
                    <p>Não vendemos, trocamos ou transferimos suas informações de identificação pessoal para terceiros. Isso não inclui parceiros confiáveis que nos auxiliam a operar nosso site, desde que essas partes concordem em manter essas informações confidenciais.</p>
                </section>

                <section>
                    <h2>5. Cookies</h2>
                    <p>Usamos cookies para entender e salvar suas preferências para visitas futuras e compilar dados agregados sobre o tráfego e a interação no site.</p>
                </section>

                <section>
                    <h2>6. Consentimento</h2>
                    <p>Ao utilizar nosso site, você concorda com nossa política de privacidade.</p>
                </section>
            </div>
        </div>
    );
};
