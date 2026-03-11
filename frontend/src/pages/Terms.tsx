import './StaticPages.css';

export const Terms = () => {
    return (
        <div className="static-page container">
            <h1 className="static-title">Termos de Uso</h1>
            <div className="static-content box-card">
                <section>
                    <h2>1. Aceitação dos Termos</h2>
                    <p>Ao acessar e clicar para usar o TutShop Marketplace, você concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis.</p>
                </section>

                <section>
                    <h2>2. Responsabilidades do Usuário</h2>
                    <p>O usuário é o único responsável pela veracidade das informações fornecidas em seu cadastro e nos anúncios publicados. É proibida a publicação de itens considerados ilegais, ofensivos ou que violem direitos de terceiros.</p>
                </section>

                <section>
                    <h2>3. Papel do Marketplace</h2>
                    <p>O TutShop atua como um facilitador de conexões entre compradores e vendedores. Não somos proprietários dos itens anunciados e não garantimos a qualidade, segurança ou legalidade dos produtos, exceto em serviços explicitamente gerenciados por nossa equipe.</p>
                </section>

                <section>
                    <h2>4. Itens Proibidos</h2>
                    <p>É terminantemente proibido anunciar:</p>
                    <ul>
                        <li>Armas e munições;</li>
                        <li>Drogas e substâncias ilícitas;</li>
                        <li>Contas de jogos ou redes sociais;</li>
                        <li>Produtos falsificados ou pirateados;</li>
                        <li>Qualquer item que viole a legislação brasileira vigente.</li>
                    </ul>
                </section>

                <section>
                    <h2>5. Planos e Pagamentos</h2>
                    <p>O marketplace oferece planos de destaque (como o Plano Destaque Banner e Plano Mais Imagens) que possuem duração de 20 dias. O não uso das funcionalidades dentro do prazo não gera direito a reembolso.</p>
                </section>

                <section>
                    <h2>6. Modificações</h2>
                    <p>O TutShop pode revisar estes termos de serviço a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.</p>
                </section>
            </div>
        </div>
    );
};
