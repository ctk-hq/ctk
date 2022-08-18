import { FunctionComponent, ReactElement, ReactNode } from "react";
import { XIcon } from "@heroicons/react/outline";
import { styled } from "@mui/joy";

export interface IModalProps {
  title: string;
  onHide: () => void;
  children: ReactNode;
}

const Root = styled("div")`
  overflow-y: auto;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
`;

const Container = styled("div")`
  display: flex;
  overflow-y: auto;
  overflow-x: hidden;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  justify-content: center;
  align-items: center;
  outline: 0;
`;

const Backdrop = styled("div")`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  background-color: #000000;
  opacity: 0.25;
`;

const Content = styled("div")`
  position: relative;
  z-index: 50;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  width: auto;
  max-width: 64rem;
`;

const Content2 = styled("div")`
  display: flex;
  position: relative;
  background-color: #ffffff;
  flex-direction: column;
  width: 100%;
  border-radius: 0.5rem;
  border-width: 0;
  outline: 0;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
`;

const Header = styled("div")`
  display: flex;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  padding-left: 1rem;
  padding-right: 1rem;
  justify-content: space-between;
  align-items: center;
  border-top-left-radius: 0.25rem;
  border-top-right-radius: 0.25rem;
  border-bottom-width: 1px;
  border-style: solid;
`;

const Title = styled("h3")`
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 600;
`;

const CloseButton = styled("button")`
  float: right;
  padding: 0.25rem;
  color: #000000;
  outline: 0;
`;

const Modal: FunctionComponent<IModalProps> = (
  props: IModalProps
): ReactElement => {
  const { title, onHide, children } = props;

  return (
    <Root>
      <Container>
        <Backdrop onClick={onHide} />
        <Content>
          <Content2>
            <Header>
              <Title>{title}</Title>
              <CloseButton onClick={onHide}>
                <XIcon className="w-4" />
              </CloseButton>
            </Header>
            {children}
          </Content2>
        </Content>
      </Container>
    </Root>
  );
};

export default Modal;
