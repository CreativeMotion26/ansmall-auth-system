import { Text, View } from "react-native";
import { shared } from "./styles";

type Props = {
  title: string;
  subtitle?: string;
};

export function ScreenIntro({ title, subtitle }: Props) {
  return (
    <View>
      <Text style={shared.title}>{title}</Text>
      {!!subtitle && <Text style={shared.subtitle}>{subtitle}</Text>}
    </View>
  );
}
